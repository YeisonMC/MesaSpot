(() => {
  'use strict';
  const min = document.querySelector('#price-min');
  const max = document.querySelector('#price-max');
  if (!min || !max) return;
  const track = document.querySelector('.price-range-track');
  const minLabel = document.querySelector('#price-min-label');
  const maxLabel = document.querySelector('#price-max-label');
  const format = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(value);
  function update(changed) {
    // Evitamos que los extremos se crucen y convertimos a céntimos solo al consultar la API.
    if (Number(min.value) > Number(max.value)) {
      if (changed === min) min.value = max.value;
      else max.value = min.value;
    }
    const unlimited = max.value === max.max;
    minLabel.textContent = format(Number(min.value));
    maxLabel.textContent = unlimited ? 'Sin límite' : format(Number(max.value));
    min.setAttribute('aria-valuetext', minLabel.textContent);
    max.setAttribute('aria-valuetext', maxLabel.textContent);
    track.style.setProperty('--range-min', (Number(min.value) / Number(min.max) * 100) + '%');
    track.style.setProperty('--range-max', (Number(max.value) / Number(max.max) * 100) + '%');
  }
  function reset() { min.value = min.defaultValue; max.value = max.defaultValue; update(); }
  min.addEventListener('input', () => update(min));
  max.addEventListener('input', () => update(max));
  document.querySelector('#reset-price').addEventListener('click', () => {
    reset(); max.dispatchEvent(new Event('change', { bubbles: true }));
  });
  min.form.addEventListener('reset', () => { queueMicrotask(update); });
  window.MesaPriceRange = {
    reset,
    params: () => ({
      minPriceCents: Number(min.value) ? Number(min.value) * 100 : undefined,
      maxPriceCents: max.value === max.max ? undefined : Number(max.value) * 100
    })
  };
  update();
})();
