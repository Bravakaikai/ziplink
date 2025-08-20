const form = document.getElementById('shorten-form');
const input = document.getElementById('input-url');
const result = document.getElementById('result');
const shortUrlEl = document.getElementById('short-url');
const copyBtn = document.getElementById('copy-btn');
const qrImg = document.getElementById('qrcode');

const infoForm = document.getElementById('info-form');
const inputCode = document.getElementById('input-code');
const infoBox = document.getElementById('info');

function setLoading(btn, loading){
  if(!btn) return;
  btn.disabled = !!loading;
  btn.dataset.loading = loading ? '1' : '';
  if(loading){
    btn._text = btn.textContent;
    btn.textContent = '處理中…';
  }else{
    if(btn._text) btn.textContent = btn._text;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setLoading(form.querySelector('button'), true);
  result.classList.add('hidden');
  infoBox.classList.add('hidden');

  try{
    const res = await fetch('/api/shorten',{
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ url: input.value.trim() })
    });
    const data = await res.json();
    if(!res.ok){
      alert(data.error || '發生錯誤');
      return;
    }

    shortUrlEl.value = data.shortUrl;
    qrImg.src = data.qrcode;
    result.classList.remove('hidden');
  }catch(err){
    console.error(err);
    alert('網路錯誤');
  }finally{
    setLoading(form.querySelector('button'), false);
  }
});

copyBtn.addEventListener('click', async () => {
  try{
    await navigator.clipboard.writeText(shortUrlEl.value);
    copyBtn.textContent = '已複製!';
    setTimeout(()=> copyBtn.textContent = '複製', 1200);
  }catch{
    alert('複製失敗');
  }
});

infoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setLoading(infoForm.querySelector('button'), true);
  infoBox.classList.add('hidden');

  const code = inputCode.value.trim();
  if(!code) return;

  try{
    const res = await fetch(`/api/info/${encodeURIComponent(code)}`);
    const data = await res.json();
    if(!res.ok){
      alert(data.error || '查詢失敗');
      return;
    }

    infoBox.innerHTML = `
      <div class="row"><span class="label">短碼:</span> <strong>${data.code}</strong></div>
      <div class="row"><span class="label">短網址:</span> <a href="${data.shortUrl}" target="_blank">${data.shortUrl}</a></div>
      <div class="row"><span class="label">原始網址:</span> <a href="${data.originalUrl}" target="_blank">${data.originalUrl}</a></div>
      <div class="row"><span class="label">點擊次數:</span> <strong>${data.clicks}</strong></div>
      <div class="row"><span class="label">建立時間:</span> ${new Date(data.createdAt).toLocaleString()}</div>
      <div class="row"><span class="label">最後點擊:</span> ${data.lastAccessedAt ? new Date(data.lastAccessedAt).toLocaleString() : '—'}</div>
    `;
    infoBox.classList.remove('hidden');
  }catch(err){
    console.error(err);
    alert('網路錯誤');
  }finally{
    setLoading(infoForm.querySelector('button'), false);
  }
});
