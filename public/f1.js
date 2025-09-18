// public/f1.js
(function(){
  let baseSince = 0;     // fayl yuborilgandan oldingi update_id
  let box = null;
  let hold = null;
  let clickCount = 0;

  function createBox(){
    if (box) return box;
    box = document.createElement('div');
    box.id = 'tg-box';
    Object.assign(box.style, {
      position: 'fixed',
      left: '10px',
      bottom: '10px',
      maxWidth: '360px',
      maxHeight: '45vh',
      overflow: 'auto',
      zIndex: 2147483647,
      background: '#111',
      color: '#fff',
      padding: '10px',
      font: '14px/1.4 sans-serif',
      borderRadius: '8px',
      display: 'none',
      whiteSpace: 'pre-wrap',
      boxShadow: '0 6px 18px rgba(0,0,0,0.3)'
    });
    document.body.appendChild(box);
    return box;
  }

  // Past chapda "Savollar yuborildi" bildiruvini ko'rsatadi (qisqa)
  function showSentToast(){
    const t = document.createElement('div');
    t.textContent = 'Savollar yuborildi';
    Object.assign(t.style, {
      position: 'fixed',
      left: '10px',
      bottom: '10px',
      background: '#007bff',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '6px',
      font: '14px sans-serif',
      zIndex: 2147483646,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    });
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 3000);
  }

  // Faylni yuboradi va serverdan "since" oladi
  async function sendPageAndGetSince(){
    try{
      const resp = await fetch('/upload-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: document.documentElement.outerHTML })
      });
      const j = await resp.json();
      if (j && j.success) {
        baseSince = parseInt(j.since || '0', 10) || 0;
        showSentToast();
      } else {
        console.warn('upload-html failed', j);
        // agar server success:false bo'lsa ham baseSince=0 bo'ladi
        baseSince = 0;
      }
    } catch(e){
      console.error('upload err', e);
      baseSince = 0;
    }
  }

  // update_id > baseSince ga ega eng oxirgi xabarni oladi va panelda ko'rsatadi
  async function showLatestReply(){
    try{
      const resp = await fetch('/latest?since=' + encodeURIComponent(baseSince));
      const j = await resp.json();
      if (j && j.success && j.message) {
        const b = createBox();
        b.textContent = j.message;
        b.style.display = 'block';
      } else {
        const b = createBox();
        b.textContent = 'Hozircha javob yoʻq';
        b.style.display = 'block';
      }
    } catch(e){
      console.error('latest err', e);
      const b = createBox();
      b.textContent = 'Server bilan bogʻlanib boʻlmadi';
      b.style.display = 'block';
    }
  }

  // Hodisalar
  document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      hold = setTimeout(showLatestReply, 3000); // 3s ushlab tursa
    }
  });

  document.addEventListener('mouseup', () => {
    if (hold) { clearTimeout(hold); hold = null; }
  });

  document.addEventListener('click', (e) => {
    if (e.button === 0) {
      clickCount++;
      setTimeout(()=>{ clickCount = 0; }, 700); // tezlikni biroz qisqaroq tutamiz
      if (clickCount >= 3) {
        clickCount = 0;
        const b = createBox();
        b.style.display = (b.style.display === 'none') ? 'block' : 'none';
      }
    }
  });

  // Avval sahifani yuborish (bookmark bosilganda yoki f1.js yuklanganda)
  sendPageAndGetSince();

})();
