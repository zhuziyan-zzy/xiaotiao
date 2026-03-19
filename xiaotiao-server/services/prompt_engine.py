"""
Prompt Template Engine — 三层架构 Jinja2 模板引擎

三层结构:
  1. 统摄层 (meta_system.j2): AI 行为总纲，控制输出格式和严谨性
  2. 全局层 (global_context.j2): 用户画像上下文，控制专业方向和难度
  3. 功能层 (各功能 *.j2): 各功能特定的参数和逻辑

后端维护人员通过编辑 prompts/*.j2 文件来定义 AI 生成的标准化模版。
前端用户通过 UI 选项注入模板变量，最终生成标准化、高质量的内容。
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional, Tuple, Type

from jinja2 import Environment, FileSystemLoader, Undefined
from pydantic import BaseModel


# Prompt 文件目录
_PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def _strip_optional_wrapper(schema: dict) -> dict:
    """Remove Pydantic v2 anyOf wrappers for Optional fields so that LLM
    providers that don't understand 'anyOf' still get a clean schema."""
    if not isinstance(schema, dict):
        return schema

    # Process $defs
    defs = schema.get("$defs", {})
    for key in defs:
        defs[key] = _strip_optional_wrapper(defs[key])

    props = schema.get("properties", {})
    for key, prop in list(props.items()):
        # Pydantic v2 wraps Optional[X] as {"anyOf": [X_schema, {"type": "null"}]}
        if "anyOf" in prop:
            non_null = [s for s in prop["anyOf"] if s.get("type") != "null"]
            if len(non_null) == 1:
                merged = {**prop}
                del merged["anyOf"]
                merged.update(non_null[0])
                props[key] = merged

        # Recurse into nested objects/arrays
        if props[key].get("type") == "object":
            props[key] = _strip_optional_wrapper(props[key])
        if props[key].get("type") == "array" and isinstance(props[key].get("items"), dict):
            props[key]["items"] = _strip_optional_wrapper(props[key]["items"])

    return schema


class PromptEngine:
    """
    三层提示词组装引擎。

    传统调用（向后兼容）：
        response = await prompt_engine.generate(
            template_name="topic_generate.j2",
            response_model=TopicGenerateResponse,
            topics=["international arbitration"],
            ...
        )

    三层调用（推荐）：
        response = await prompt_engine.generate_with_context(
            template_name="topic_generate.j2",
            response_model=TopicGenerateResponse,
            user_profile={"user_subject_field": "法学", ...},
            feature_params={"topics": [...], "level": "intermediate", ...},
        )
    """

    SECTION_SEPARATOR = "\n---\n"

    def __init__(self, prompts_dir: str | None = None):
        self._dir = prompts_dir or _PROMPTS_DIR
        self.env = Environment(
            loader=FileSystemLoader(self._dir),
            # 保留未定义变量为空字符串（而非报错），方便模板编写
            undefined=_SilentUndefined,
            # 去除模板块前后多余空行
            trim_blocks=True,
            lstrip_blocks=True,
            # 热更新：每次渲染都检查文件是否被修改
            auto_reload=True,
        )
        # 注册常用 filter
        self.env.filters["join_or_default"] = _join_or_default

    # ──────────────────────────────────────────────
    #  Public API
    # ──────────────────────────────────────────────

    def render(self, template_name: str, **variables: Any) -> Tuple[str, str]:
        """
        渲染 Jinja2 模板，返回 (system_prompt, user_prompt)。

        模板内使用 ``---`` 分隔 system 部分和 user 部分。
        """
        template = self.env.get_template(template_name)
        rendered = template.render(**variables)
        return self._split_sections(rendered)

    def render_partial(self, template_name: str, **variables: Any) -> str:
        """
        渲染一个局部模板（不分割 system/user），返回完整渲染结果。
        用于渲染统摄层和全局层模板。
        """
        try:
            template = self.env.get_template(template_name)
            return template.render(**variables).strip()
        except Exception:
            return ""

    def get_response_schema(self, response_model: Type[BaseModel]) -> dict:
        """从 Pydantic model 生成 JSON Schema，并清理 Optional 包装。"""
        schema = response_model.model_json_schema()
        return _strip_optional_wrapper(schema)

    async def generate(
        self,
        template_name: str,
        response_model: Type[BaseModel],
        *,
        max_tokens: int = 4000,
        feature_id: str = "",
        **variables: Any,
    ) -> BaseModel:
        """
        传统一站式调用（向后兼容）：
        1. 渲染 Jinja2 模板
        2. 生成 JSON Schema
        3. 调用 LLM（带 schema 约束）
        4. Pydantic 校验 & 返回类型安全的对象
        """
        system_prompt, user_prompt = self.render(template_name, **variables)
        schema = self.get_response_schema(response_model)

        # 延迟导入，避免循环依赖
        from services.llm import call_llm_with_schema

        raw = await call_llm_with_schema(
            system_prompt, user_prompt, schema, max_tokens=max_tokens, feature_id=feature_id
        )
        return response_model.model_validate(raw)

    async def generate_with_context(
        self,
        template_name: str,
        response_model: Type[BaseModel],
        *,
        user_profile: dict | None = None,
        feature_params: dict | None = None,
        max_tokens: int = 4000,
        feature_id: str = "",
    ) -> BaseModel:
        """
        三层架构调用：
        1. 渲染统摄层 (meta_system.j2)
        2. 渲染全局层 (global_context.j2, 注入 user_profile)
        3. 渲染功能层 (template_name, 注入 feature_params + user_profile)
        4. 组装完整 system prompt = Layer1 + Layer2 + Layer3_system
        5. user prompt = Layer3_user
        6. 调用 LLM → Pydantic 校验
        """
        profile = user_profile or {}
        params = feature_params or {}

        # Layer 1: 统摄性提示词
        meta_system = self.render_partial("meta_system.j2")

        # Layer 2: 全局性提示词（用户画像）
        global_context = self.render_partial("global_context.j2", **profile)

        # Layer 3: 功能性提示词
        # 合并 profile 到 params，使功能模板也能访问用户画像变量
        merged_vars = {**profile, **params}
        feature_system, feature_user = self.render(template_name, **merged_vars)

        # 组装完整 system prompt
        system_parts = [p for p in [meta_system, global_context, feature_system] if p]
        system_prompt = "\n\n".join(system_parts)

        schema = self.get_response_schema(response_model)

        from services.llm import call_llm_with_schema

        raw = await call_llm_with_schema(
            system_prompt, feature_user, schema, max_tokens=max_tokens, feature_id=feature_id
        )
        return response_model.model_validate(raw)

    # ──────────────────────────────────────────────
    #  Internal helpers
    # ──────────────────────────────────────────────

    def _split_sections(self, rendered: str) -> Tuple[str, str]:
        """
        按 ``---`` 分隔符拆分为 system / user 两段。
        如果没有分隔符，整段作为 user prompt，system 留空。
        """
        if self.SECTION_SEPARATOR in rendered:
            parts = rendered.split(self.SECTION_SEPARATOR, 1)
            return parts[0].strip(), parts[1].strip()
        return "", rendered.strip()


# ──────────────────────────────────────────────
#  Jinja2 helpers
# ──────────────────────────────────────────────


class _SilentUndefined(Undefined):
    """Jinja2 undefined 策略：未定义变量返回空字符串，不报错。"""

    def __str__(self):
        return ""

    def __iter__(self):
        return iter([])

    def __bool__(self):
        return False

    def __getattr__(self, name):
        return self


def _join_or_default(value, sep=", ", default="General") -> str:
    """Jinja2 filter: join list or return default string."""
    if not value:
        return default
    if isinstance(value, str):
        return value
    return sep.join(str(v) for v in value)


# ──────────────────────────────────────────────
#  Singleton
# ──────────────────────────────────────────────

prompt_engine = PromptEngine()
