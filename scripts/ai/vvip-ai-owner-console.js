(function mountVvipAiOwnerConsole(global) {
  'use strict';

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (typeof text === 'string') element.textContent = text;
    return element;
  }

  function agentLabel(agent) {
    return agent && agent.label ? agent.label : 'Unknown AI Agent';
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
      createElement('span', 'pr35-kicker', 'TIGER AI — AI-01'),
      createElement('h2', '', 'مركز القيادة بالذكاء الاصطناعي'),
    );
    headingCopy.querySelector('h2').id = 'ai-command-center-title';

    const status = createElement(
      'span',
      'pr35-empty',
      api.FEATURE_FLAGS.AI_COMMAND_CENTER_ENABLED ? 'مفعّل' : 'الأساس مثبت — التفعيل التنفيذي مقفل افتراضيًا',
    );
    heading.append(headingCopy, status);

    const intro = createElement(
      'p',
      'pr35-disclosure',
      'أربع وحدات إدارية مع بوابة صلاحيات مغلقة افتراضيًا. لا حذف بيانات، لا تحويل أموال، ولا تغيير صلاحيات المالك بواسطة AI.',
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
    policy.textContent = 'L1 قراءة وتحليل · L2 اقتراح · L3 تنفيذ آمن قابل للعكس · L4 موافقة المالك إلزامية';

    const promptLabel = createElement('label', 'pr35-search');
    promptLabel.append(document.createTextNode('اسأل مدير VVIP TIGER'));
    const prompt = document.createElement('input');
    prompt.type = 'text';
    prompt.disabled = true;
    prompt.placeholder = 'سيُفعّل بعد ربط Backend AI الآمن وموافقة المالك على مزود النموذج.';
    prompt.setAttribute('aria-label', 'مساعد المدير العام غير مفعّل بعد');
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
