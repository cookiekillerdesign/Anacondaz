import '../style.css';
import { initShared } from '../shared.js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

initShared();

const form = document.getElementById('bookingForm');
const statusEl = document.getElementById('formStatus');
const dateInput = document.getElementById('date');
if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10); // no picking a date in the past

function buildMailto({ name, org, city, date, format, contact, msg }) {
  const subject = encodeURIComponent(`Букинг: ${org} — ${city}`);
  const body = encodeURIComponent(
    `Имя: ${name}\nОрганизация/площадка: ${org}\nГород: ${city}\nЖелаемая дата: ${date || 'не указана'}\nФормат: ${format}\nКонтакт: ${contact}\n\nДетали:\n${msg}`
  );
  return `mailto:booking@anacondaz.ru?subject=${subject}&body=${body}`;
}

function setStatus(text, ok) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.classList.toggle('ok', Boolean(ok));
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('name').value.trim(),
      org: document.getElementById('org').value.trim(),
      city: document.getElementById('city').value.trim(),
      date: document.getElementById('date').value,
      format: document.getElementById('format').value,
      contact: document.getElementById('contactInfo').value.trim(),
      msg: document.getElementById('msg').value.trim(),
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';

    let savedToSupabase = false;
    if (isSupabaseConfigured) {
      try {
        const supabase = await getSupabase();
        const { error } = await supabase.from('booking_requests').insert({
          name: payload.name,
          organization: payload.org,
          city: payload.city,
          event_date: payload.date || null,
          format: payload.format,
          contact: payload.contact,
          message: payload.msg,
        });
        if (error) throw error;
        savedToSupabase = true;
      } catch (err) {
        // network error, RLS/policy issue, etc. — fall through to the mailto backup below
        console.error('[booking] supabase insert failed, falling back to mailto:', err?.message || err);
      }
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Отправить заявку →';

    if (savedToSupabase) {
      form.reset();
      setStatus('Заявка отправлена. Мы свяжемся в течение 3 дней — либо пишите сразу на booking@anacondaz.ru.', true);
      return;
    }

    // fallback: open a prefilled email in the user's mail client
    setStatus('Открываем письмо в вашей почте. Если ничего не произошло — пишите сразу на booking@anacondaz.ru.', true);
    window.location.href = buildMailto(payload);
  });
}
