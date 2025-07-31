// Hilfsfunktion: Preise im Text finden (Bsp: 12.99 oder 3,50)
function extractPrices(text) {
  // Preise mit Punkt oder Komma als Dezimaltrennzeichen
  const priceRegex = /(\d{1,4}[\.,]\d{2})/g;
  const matches = text.match(priceRegex);
  if (!matches) return [];
  // Einheitlich als float mit Punkt speichern
  return matches.map(p => parseFloat(p.replace(',', '.')));
}

// Hilfsfunktion: Datum heute in "YYYY-MM" format
function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() +1).padStart(2,'0')}`;
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

  const prices = extractPrices(text);
  if (prices.length === 0) {
    alert('Keine Preise gefunden. Bitte korrigiere den Text.');
    return;
  }

  // Eintrag erstellen mit Datum
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  if (!currentData[monthKey]) currentData[monthKey] = [];

  currentData[monthKey].push({
    date: today.toISOString().slice(0,10),
    text,
    prices
  });

  saveData(currentData);
  alert('Ausgabe gespeichert!');

  // Anzeige Monatsübersicht aktualisieren
  showMonthsOverview();
  showSection(overviewSection);

  // Reset Upload-Feld & Text
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
    // Summe der Preise im Monat berechnen
    const allPrices = currentData[month].flatMap(e => e.prices);
    const total = allPrices.reduce((a,b) => a+b, 0);

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

  currentData[month].forEach((entry, i) => {
    const li = document.createElement('li');
    // Zeige Datum, Text und Summe aller Preise im Eintrag
    const sum = entry.prices.reduce((a,b) => a+b, 0);
    li.textContent = `${entry.date}: ${sum.toFixed(2)} € — ${entry.text.replace(/\n/g,' ')}`;
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
