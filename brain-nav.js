/* Main-demo marker and homepage disclosure behavior.
   The public destination catalog is owned by network-nav.js on every site. */
(() => {
  const picker=document.querySelector('.project-picker');
  if(!picker)return;
  picker.addEventListener('keydown',event=>{
    if(event.key==='Escape'){picker.open=false;picker.querySelector('summary').focus();}
  });
  document.addEventListener('click',event=>{if(!picker.contains(event.target))picker.open=false;});
})();
