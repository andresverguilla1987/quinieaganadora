
console.log('Frontend loaded. window.API_BASE=', window.API_BASE);
(function(){
  function el(id){return document.getElementById(id);}
  const th = el('threshold'), tv = el('th-value');
  th.addEventListener('input', ()=> tv.textContent = th.value);
  async function fetchMatches(){
    try{
      const res = await fetch((window.API_BASE||'') + '/matches');
      if(!res.ok) throw new Error('no matches');
      const data = await res.json();
      const ul = el('matches'); ul.innerHTML='';
      data.forEach(m=>{ const li=document.createElement('li'); li.textContent = m.home_team + ' vs ' + m.away_team; ul.appendChild(li); });
    }catch(e){
      document.getElementById('matches').innerHTML='<li>Error fetching matches</li>';
    }
  }
  document.getElementById('btn-gen').addEventListener('click', fetchMatches);
  fetchMatches();
})();