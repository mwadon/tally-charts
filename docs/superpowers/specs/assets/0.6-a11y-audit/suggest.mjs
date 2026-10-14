const h2 = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16))
const lum = c => { const f = v => { v/=255; return v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4 }; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]) }
const cr = (a,b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05) }
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2,'0')).join('')
const mix = (a, p, b) => a.map((v,i) => Math.round(v*p + b[i]*(1-p)))
const S = h2('#fafafa')
for (const [n, t] of [['warn','#f1a23b'],['gain','#23a866'],['neutral','#a3a3ab'],['accent-soft','#9dbcf6'],['loss','#e5368d']]) {
  let p = 1; let c = h2(t); while (cr(c, S) < 3.1 && p > 0.3) { p -= 0.01; c = mix(h2(t), p, [0,0,0]) }
  console.log(`light ${n}: ${t} ${cr(h2(t),S).toFixed(2)} -> ${hex(c)} (${Math.round(p*100)}% with black) ${cr(c,S).toFixed(2)}:1 vs surface; vs white ${cr(c,[255,255,255]).toFixed(2)}`)
}
// Pill value text: tone mixed with ink at --ch-tone-text-mix (55%) on tooltip-bg
// Dark seq ramp alternative: level 5 = pure base, text = surface color
const D = h2('#121215')
for (const [n, t] of [['accent','#4d86ff'],['accent-soft','#5a7cc4'],['loss','#ff4fa0'],['warn','#ffb24d'],['gain','#3ccf86'],['neutral','#7c7c86']]) {
  const base = h2(t); const l4 = mix(base, 0.65, D)
  console.log(`dark ${n}: seq-5=base ${t} vs surface ${cr(base,D).toFixed(2)}, vs seq-4 ${cr(base,l4).toFixed(2)}, ink #121215 on it ${cr(D,base).toFixed(2)}, white on it ${cr([255,255,255],base).toFixed(2)}`)
}
