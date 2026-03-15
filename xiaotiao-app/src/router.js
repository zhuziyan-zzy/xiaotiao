// Simple hash-based router for SPA
export class Router {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.routes = {};
    this.inits = {};
    window.addEventListener('hashchange', () => this.resolve());
  }

  register(path, renderer, init = null) {
    this.routes[path] = renderer;
    if (init) this.inits[path] = init;
    return this;
  }

  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const renderer = this.routes[hash] || this.routes['/'];
    if (renderer && this.container) {
      this.container.innerHTML = renderer();

      // Run page init if defined
      const init = this.inits[hash] || this.inits['/'];
      if (this.inits[hash]) this.inits[hash]();

      this.updateNavLinks(hash);
    }
  }

  updateNavLinks(currentHash) {
    document.querySelectorAll('.nav-link').forEach(link => {
      const route = link.dataset.route;
      link.classList.toggle('active', route === currentHash);
    });
  }
}
