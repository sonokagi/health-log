const storageKey = 'health-log.records';
const add = document.querySelector('#add');
const content = document.querySelector('main');
const editor = document.querySelector('#editor');
const form = document.querySelector('#record-form');
const recordedAt = document.querySelector('#recorded-at');
const temperature = document.querySelector('#temperature');
const memo = document.querySelector('#memo');
const save = document.querySelector('#save');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
const empty = document.querySelector('#empty');
const list = document.querySelector('#records');
const history = document.querySelector('#history');

let records = [];
let editingId = null;
let storageReady = false;

function nowForInput() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function resetForm() {
  editingId = null;
  form.reset();
  recordedAt.value = nowForInput();
  editor.setAttribute('aria-label', '体調を記録');
  save.textContent = '保存';
}

function openEditor() {
  history.hidden = true;
  editor.hidden = false;
  add.textContent = 'キャンセル';
  add.setAttribute('aria-expanded', 'true');
  status.textContent = '';
  error.textContent = '';
  content.scrollTop = 0;
  editor.focus({ preventScroll: true });
}

function closeEditor() {
  editor.hidden = true;
  history.hidden = false;
  add.textContent = '追加';
  add.setAttribute('aria-expanded', 'false');
  resetForm();
  content.scrollTop = 0;
  add.focus({ preventScroll: true });
}

function readRecords() {
  const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  if (!Array.isArray(stored)) throw new Error('Invalid records');
  return stored;
}

function persist(nextRecords) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextRecords));
  } catch {
    status.textContent = '';
    error.textContent = '変更を保存できませんでした。ブラウザーの保存設定や空き容量を確認してください。';
    return false;
  }
  records = nextRecords;
  error.textContent = '';
  renderRecords();
  return true;
}

function makeButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function renderRecords() {
  const sorted = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  empty.hidden = !storageReady || sorted.length > 0;
  list.replaceChildren();

  for (const record of sorted) {
    const item = document.createElement('li');
    item.className = 'panel';
    const time = document.createElement('time');
    time.dateTime = record.recordedAt;
    time.textContent = record.recordedAt.replaceAll('-', '/').replace('T', ' ');
    item.append(time);

    if (record.temperature !== '') {
      const reading = document.createElement('p');
      reading.className = 'reading';
      reading.textContent = `${record.temperature} ℃`;
      item.append(reading);
    }
    if (record.memo) {
      const note = document.createElement('p');
      note.className = 'memo';
      note.textContent = record.memo;
      item.append(note);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(
      makeButton('編集', 'secondary', () => editRecord(record)),
      makeButton('削除', 'danger', () => deleteRecord(record)),
    );
    item.append(actions);
    list.append(item);
  }
}

function editRecord(record) {
  editingId = record.id;
  recordedAt.value = record.recordedAt;
  temperature.value = record.temperature;
  memo.value = record.memo;
  editor.setAttribute('aria-label', '記録を編集');
  save.textContent = '変更を保存';
  openEditor();
}

function deleteRecord(record) {
  if (!window.confirm('この記録を削除しますか？')) return;
  if (!persist(records.filter((entry) => entry.id !== record.id))) return;
  status.textContent = '記録を削除しました。';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!storageReady) return;
  const record = {
    id: editingId ?? crypto.randomUUID(),
    recordedAt: recordedAt.value,
    temperature: temperature.value,
    memo: memo.value,
  };
  const nextRecords = editingId
    ? records.map((entry) => entry.id === editingId ? record : entry)
    : [...records, record];
  if (!persist(nextRecords)) return;
  status.textContent = editingId ? '変更を保存しました。' : '記録を保存しました。';
  closeEditor();
});

add.addEventListener('click', () => {
  if (!editor.hidden) {
    error.textContent = '';
    closeEditor();
    return;
  }
  resetForm();
  openEditor();
});

resetForm();
try {
  records = readRecords();
  storageReady = true;
} catch {
  add.disabled = true;
  error.textContent = '端末の記録を読み込めませんでした。ブラウザーの保存設定を確認してください。';
}
renderRecords();
