// Capture bank registry. Each bank is loaded by a classic script for local-file compatibility.
for(const [key,bank] of Object.entries(window.ENGINE_SOUNDS))bank.deprecated=!['JZ1Street','RB26Tour','JZ2Tour','RotaryTour'].includes(key);
for(const [old,current] of Object.entries({RB25:'RB26Tour','2JZ':'JZ2Tour',Rotary:'RotaryTour'}))window.ENGINE_SOUNDS[old]={...window.ENGINE_SOUNDS[current],deprecated:true};
