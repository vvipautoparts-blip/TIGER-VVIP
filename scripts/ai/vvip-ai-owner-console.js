(function mountVvipAiOwnerConsole(global) {
  'use strict';

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (typeof text === 'string') element.textContent = text;
    return element;
  }

  function agentLabel(agent) {
    return agent && agent.label ? agent.label : 'Unknown Sovereign Profile';
  }

  function mount() {
    const root = document.querySelector('[data-owner-console]');
    const api = global.VVIPAICommandCenter;
    if (!root || !api || root.querySelector('[data-ai-command-center]')) return;

    const panel = createElement('section', 'pr35-panel');
    panel.setAttribute('data-ai-command-center', '');
    panel.setAttribute('aria-labelledby', 'ai-command-center-title');

    const heading = createElement('div', 'pr35-heading');
    const headingCopy = createElement('div');
    headingCopy.append(
      createElement('span', 'pr35-kicker', 'TIGER SOVEREIGN INTELLIGENCE'),
      createElement('h2', '', 'مركز الذكاء السيادي'),
    );
    headingCopy.querySelector('h2').id = 'ai-command-center-title';

    const statusText = !api.REGISTRY_AVAILABLE
      ? 'مقفل — سجل السياسات السيادي غير متاح'
      : api.FEATURE_FLAGS.AI_COMMAND_CENTER_ENABLED
        ? 'مفعّل عبر بوابة السياسات السيادية'
        : 'السلطة مثبتة — التنفيذ مقفل افتراضيًا';
    const status = createElement('span', 'pr35-empty', statusText);
    heading.append(headingCopy, status);

    const intro = createElement(
      'p',
      'pr35-disclosure',
      'محرك سيادي واحد بملفات تعريف متخصصة وسجل صلاحيات واحد. لا وصول مباشر لقاعدة البيانات، لا أسرار أو AWS/IAM، لا حذف إنتاجي، ولا استدلال سحابي مدفوع كمسار افتراضي.',
    );

    const grid = createElement('div', 'pr35-grid');
    Object.values(api.AGENTS).forEach(function appendAgent(agent) {
      const card = createElement('article', 'pr35-panel');
      card.setAttribute('data-ai-agent', agent.id);
      card.append(
        createElement('span', 'pr35-kicker', agent.id.toUpperCase()),
        createElement('h3', '', agentLabel(agent)),
        createElement('p', 'pr35-empty', agent.mission),
      );
      grid.append(card);
    });

    const policy = createElement('div', 'pr35-status');
    policy.setAttribute('role', 'status');
    policy.textContent = 'Rule → Metric/API → Local Model → Browser AI → No-AI · الاستدلال المدفوع = 0 افتراضيًا';

    const promptLabel = createElement('label', 'pr35-search');
    promptLabel.append(document.createTextNode('اسأل TIGER Sovereign Director'));
    const prompt = document.createElement('input');
    prompt.type = 'text';
    prompt.disabled = true;
    prompt.placeholder = 'يبقى الإدخال مقفلًا حتى تتوفر قدرة محلية/متصفح مصرح بها؛ لا fallback سحابي مدفوع.';
    prompt.setAttribute('aria-label', 'TIGER Sovereign Director غير مفعّل للتنفيذ بعد');
    promptLabel.append(prompt);

    panel.append(heading, intro, policy, grid, promptLabel);

    const metrics = root.querySelector('.pr35-metrics');
    if (metrics && metrics.parentNode === root) {
      metrics.insertAdjacentElement('afterend', panel);
    } else {
      root.append(panel);
    }
  }

  global.VVIP_AI_OWNER_CONSOLE = Object.freeze({ mount });

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', mount);
  }
})(typeof window !== 'undefined' ? window : globalThis);
