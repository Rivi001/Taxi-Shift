// Capability detection includes tablets that advertise a desktop user agent.
export const touchDevice=navigator.maxTouchPoints>0 || matchMedia('(any-pointer: coarse)').matches || !!window.Capacitor?.isNativePlatform?.();
const compact=matchMedia('(max-width: 850px)');
function updateMode(){
  const mobile=touchDevice||compact.matches;
  document.body.classList.toggle('mobile-mode',mobile);
  document.getElementById('welcome-controls').textContent=mobile?'Steer left. Pedals right. Rotate for a wider view.':'Keyboard or touch. Your call.';
}
updateMode();
if(compact.addEventListener)compact.addEventListener('change',updateMode);
else compact.addListener(updateMode);
