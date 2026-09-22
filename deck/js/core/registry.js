/**
 * registry.js
 * Deck — Pluggable Module Registry
 * Manages module registration, lifecycle (mount/unmount), and tab activation.
 */

export class ModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.mountedModules = new Set();
    this.activeModuleId = null;
  }

  register(module) {
    if (!module.id || typeof module.mount !== 'function') {
      throw new Error(`[Deck Registry] Invalid module format for "${module?.id || 'unknown'}"`);
    }
    this.modules.set(module.id, module);
  }

  get(id) {
    return this.modules.get(id);
  }

  getAll() {
    return Array.from(this.modules.values());
  }

  async activate(id, container, context) {
    const nextModule = this.modules.get(id);
    if (!nextModule) {
      console.warn(`[Deck Registry] Module "${id}" not found.`);
      return;
    }

    // Unmount previous active module if unmount is defined
    if (this.activeModuleId && this.activeModuleId !== id) {
      const prevModule = this.modules.get(this.activeModuleId);
      if (prevModule && typeof prevModule.unmount === 'function') {
        try {
          prevModule.unmount();
        } catch (err) {
          console.error(`[Deck Registry] Error unmounting module "${this.activeModuleId}":`, err);
        }
      }
    }

    this.activeModuleId = id;

    // Only mount if not already rendered or if container is empty
    if (!this.mountedModules.has(id) || container.children.length === 0) {
      try {
        await nextModule.mount(container, context);
        this.mountedModules.add(id);
      } catch (err) {
        console.error(`[Deck Registry] Error mounting module "${id}":`, err);
        container.innerHTML = `<div class="bento-card" style="padding: 20px; color: var(--rose-primary);">Error loading ${nextModule.title || id}</div>`;
      }
    }
  }
}

export const registry = new ModuleRegistry();
