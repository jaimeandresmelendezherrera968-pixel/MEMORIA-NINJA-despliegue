export function iniciarFitNivel() {
    function fit() {
        var c = document.querySelector('.zona-fit-canvas');
        if (!c) return;
        c.style.transform = 'translate(-50%,-50%) scale(1)';
        var bw = Math.max(c.offsetWidth, 660), bh = Math.max(c.scrollHeight, c.offsetHeight, 720);
        var vw = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
        var vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
        c.style.transform = 'translate(-50%,-50%) scale(' + Math.min(vw / bw, vh / bh) + ')';
    }
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', function () { setTimeout(fit, 80); setTimeout(fit, 300); setTimeout(fit, 700); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    setTimeout(fit, 40); setTimeout(fit, 200); setTimeout(fit, 500); setTimeout(fit, 1000);
}
