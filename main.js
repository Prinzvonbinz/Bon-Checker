// Funktion, um den Gesamtpreis aus dem Text gezielt zu finden
function extractTotalPrice(text) {
  // Suche Zeilen mit 'gesamt', 'summe', 'total' (case insensitive)
  const lines = text.toLowerCase().split('\n');
  for (const line of lines) {
    if (line.includes('gesamt') || line.includes('summe') || line.includes('total')) {
      // Suche Preis in der Zeile
      const match = line.match(/(\d{1,4}[\.,]\d{2})/);
      if (match) {
        return parseFloat(match[1].replace(',', '.'));
      }
    }
  }
  return null;
}

// Speicher Key
const STORAGE_KEY = 'receiptTrackerData';

// Daten laden
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Daten speichern
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const imageUpload = document.getElementById('imageUpload');
const loadingDiv = document.getElementById('loading');
const ocrResultSection = document.getElementById('ocr-result');
const textResult = document.getElementById('textResult');
const saveEntryBtn = document.getElementById('saveEntry');
const overviewSection = document.getElementById('overview');
const monthsList = document.getElementById('monthsList');
const detailsSection = document.getElementById('details');
const selectedMonthSpan = document.getElementById('selectedMonth');
const monthEntriesList = document.getElementById('monthEntries');
const backToMonthsBtn = document.getElementById('backToMonths');

let currentData = loadData();
let currentMonth = null;

function showLoading(show) {
  loadingDiv.style.display = show ? 'block' : 'none';
}

function showSection(section) {
  // Alle verstecken
  [ocrResultSection, overviewSection, detailsSection].forEach(s => s.style.display = 'none');
  if (section) section.style.display = 'block';
}

imageUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  showLoading(true);
  showSection(null);

  const img = URL.createObjectURL(file);

  try {
    const { data: { text } } = await Tesseract.recognize(img, 'deu', {
      logger: m => {
        // Optional: Fortschritt ausgeben
        // console.log(m);
      }
    });
    textResult.value = text.trim();
    showSection(ocrResultSection);
  } catch (err) {
    alert('Fehler bei der Texterkennung: ' + err.message);
  } finally {
    showLoading(false);
    URL.revokeObjectURL(img);
  }
});

saveEntryBtn.addEventListener('click', () => {
  const text = textResult.value.trim();
  if (!text) {
    alert('Bitte Text eingeben oder OCR erneut durchführen.');
    return;
  }

  const totalPrice = extractTotalPrice(text);
  if (totalPrice === null) {
    alert('Kein Gesamtpreis gefunden. Bitte prüfe den Text oder gib den Gesamtpreis manuell an.');
    return;
  }

  // Eintrag erstellen mit Datum und Gesamtpreis
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  if (!currentData[monthKey]) currentData[monthKey] = [];

  currentData[monthKey].push({
    date: today.toISOString().slice(0,10),
    text,
    totalPrice
  });

  saveData(currentData);
  alert('Ausgabe gespeichert!');

  showMonthsOverview();
  showSection(overviewSection);

  imageUpload.value = '';
  textResult.value = '';
});

function showMonthsOverview() {
  overviewSection.style.display = 'block';
  monthsList.innerHTML = '';

  const months = Object.keys(currentData).sort((a,b) => b.localeCompare(a)); // Neueste zuerst

  if (months.length === 0) {
    monthsList.innerHTML = '<p>Keine Ausgaben gespeichert.</p>';
    return;
  }

  months.forEach(month => {
    // Summe der Gesamtpreise im Monat berechnen
    const total = currentData[month].reduce((sum, entry) => sum + entry.totalPrice, 0);

    const div = document.createElement('div');
    div.textContent = `${month} — Gesamt: ${total.toFixed(2)} €`;
    div.addEventListener('click', () => {
      showMonthDetails(month);
    });
    monthsList.appendChild(div);
  });
}

function showMonthDetails(month) {
  currentMonth = month;
  selectedMonthSpan.textContent = month;
  monthEntriesList.innerHTML = '';

  currentData[month].forEach((entry) => {
    const li = document.createElement('li');
    // Zeige Datum, Gesamtpreis und Text (einzeilig)
    li.textContent = `${entry.date}: ${entry.totalPrice.toFixed(2)} € — ${entry.text.replace(/\n/g,' ')}`;
    monthEntriesList.appendChild(li);
  });

  showSection(detailsSection);
}

backToMonthsBtn.addEventListener('click', () => {
  showMonthsOverview();
  showSection(overviewSection);
});

// Start mit Übersicht
showMonthsOverview();
showSection(overviewSection);
