import type { FC } from 'hono/jsx'

export const Layout: FC<{ children: any; title: string; isAdmin: boolean; appName: string }> = ({
  children,
  title,
  isAdmin,
  appName,
}) => {
  return (
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} - ${appName}`}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans KR", sans-serif; }
          @keyframes toast-in { from { transform: translateY(-1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes toast-out { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-1rem); opacity: 0; } }
          .toast-enter { animation: toast-in 0.2s ease-out forwards; }
          .toast-exit { animation: toast-out 0.2s ease-in forwards; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner { animation: spin 0.6s linear infinite; }
        `}</style>
      </head>
      <body class="min-h-screen bg-slate-50 text-slate-900">
        <div id="toast-container" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none"></div>
        <header class="bg-white border-b border-slate-200">
          <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" class="flex items-center gap-2 font-semibold text-lg">
              <span aria-hidden>🎾</span>
              <span>{appName}</span>
            </a>
            <nav class="flex items-center gap-3 text-sm">
              <a href="/" class="text-slate-700 hover:text-blue-600">작업 이력</a>
              <a href="/strings" class="text-slate-700 hover:text-blue-600">보유 스트링</a>
              {isAdmin && <a href="/rhksflwk" class="text-slate-700 hover:text-blue-600">대시보드</a>}
              {isAdmin && <a href="/logout" class="text-red-600 hover:text-red-700">로그아웃</a>}
            </nav>
          </div>
        </header>
        <main class="max-w-5xl mx-auto px-4 py-6">{children}</main>
        <footer class="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {appName}
        </footer>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var params = new URLSearchParams(window.location.search);
            var toastType = params.get('toast');
            var toastMsg = params.get('msg');
            if (toastType && toastMsg) {
              showToast(decodeURIComponent(toastMsg), toastType);
              params.delete('toast');
              params.delete('msg');
              var newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
              window.history.replaceState({}, '', newUrl);
            }
            function showToast(msg, type) {
              var container = document.getElementById('toast-container');
              if (!container) return;
              var el = document.createElement('div');
              var bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
              el.className = bg + ' text-white px-4 py-2.5 rounded-lg shadow-lg text-sm toast-enter pointer-events-auto';
              el.textContent = msg;
              container.appendChild(el);
              setTimeout(function(){
                el.classList.remove('toast-enter');
                el.classList.add('toast-exit');
                setTimeout(function(){ el.remove(); }, 200);
              }, 3000);
            }
            window.showToast = showToast;
          })();
        ` }} />
      </body>
    </html>
  )
}