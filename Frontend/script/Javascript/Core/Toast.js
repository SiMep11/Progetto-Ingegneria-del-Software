function _injectStyles() {
    if (document.getElementById('fc-toast-styles')) return;
    const style = document.createElement('style');
    style.id = 'fc-toast-styles';
    style.textContent = `
        #fc-toast-container{position:fixed;top:20px;right:20px;z-index:9999;
            display:flex;flex-direction:column;gap:8px;pointer-events:none;}
        .fc-toast{padding:12px 18px;border-radius:8px;color:#fff;font-size:14px;font-weight:500;
            box-shadow:0 4px 12px rgba(0,0,0,.18);max-width:320px;pointer-events:auto;
            animation:fcSlideIn .2s ease;}
        .fc-toast.success{background:#38A169;}
        .fc-toast.error  {background:#E53E3E;}
        .fc-toast.info   {background:#3182CE;}
        @keyframes fcSlideIn{from{transform:translateX(120%);opacity:0;}to{transform:translateX(0);opacity:1;}}
        @keyframes fcFadeOut{from{opacity:1;}to{opacity:0;transform:translateX(40px);}}
    `;
    document.head.appendChild(style);
}

export function showToast(message, type = 'success', duration = 3000) {
    _injectStyles();
    let container = document.getElementById('fc-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'fc-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `fc-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fcFadeOut .3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
