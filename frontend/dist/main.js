console.log('Frontend loaded. Will use window.API_BASE for API calls.');
(function(){
 function el(id){return document.getElementById(id);} 
 async function fetchMatches(){
  try{ const res = await fetch(window.API_BASE + '/matches'); const data = await res.json(); const ul = el('matches'); ul.innerHTML=''; data.forEach(m=>{ const li=document.createElement('li'); li.textContent = m.home_team + ' vs ' + m.away_team; ul.appendChild(li); }); }catch(e){ document.getElementById('matches').innerHTML='<li>Error fetching matches</li>'; }
 }
 document.getElementById('btn-gen').addEventListener('click', fetchMatches);
 fetchMatches();
})();