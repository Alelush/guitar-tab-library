// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('token');
    const navLinks = document.querySelector('#nav-links');
    let myFavorites = []; 
    
// Работа с избранными табулатурами

// Получение списка избранных табулатур текущего пользователя
    async function updateFavoritesList() {
        if (!token) { myFavorites = []; return; }
        try {
            const res = await fetch('/api/tabs/favorites/ids', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) { myFavorites = (await res.json()).map(id => String(id)); }
        } catch (e) { console.error(e); }
    }

// Добавление или удаление табулатуры из избранного
    async function toggleLike(tabId, elementToUpdate) {
        if (!token) return alert('Войдите, чтобы добавить в избранное');
        try {
            const res = await fetch(`/api/tabs/${tabId}/favorite`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                if(elementToUpdate) elementToUpdate.textContent = data.isFavorite ? '❤️' : '🤍';
                return data.isFavorite; 
            }
        } catch (e) { console.error('Ошибка лайка', e); }
    }

// Создание модального окна для выбора музыкального размера
    function injectTSModal() {
        if (document.getElementById('ts-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'ts-modal';
        modal.className = 'ts-modal';
        modal.innerHTML = `
            <div class="ts-modal-content">
                <h3>РАЗМЕР</h3>
                <div class="ts-control-row">
                    <button type="button" class="ts-btn" id="ts-num-minus">—</button>
                    <span id="ts-num-val" class="ts-val">4</span>
                    <button type="button" class="ts-btn ts-btn-plus" id="ts-num-plus">+</button>
                </div>
                <div class="ts-control-row">
                    <button type="button" class="ts-btn" id="ts-den-minus">—</button>
                    <span id="ts-den-val" class="ts-val">4</span>
                    <button type="button" class="ts-btn ts-btn-plus" id="ts-den-plus">+</button>
                </div>
                <div class="ts-actions">
                    <button type="button" id="ts-cancel-btn" class="ts-action-btn cancel">Отмена</button>
                    <button type="button" id="ts-apply-btn" class="ts-action-btn apply">Применить</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
    injectTSModal();

// Навигация и управление авторизацией
    if (token) {
        navLinks.innerHTML = `
            <a href="/">Все табы</a>
            <a href="#" id="logout-btn" class="btn-primary">Выйти</a>
        `;
        document.querySelector('#logout-btn').addEventListener('click', (e) => {
            e.preventDefault(); localStorage.removeItem('token'); window.location.href = '/login.html';
        });

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role === 'creator') {
                const createBtn = document.createElement('a');
                createBtn.href = '/create-tab.html';
                createBtn.className = 'btn-primary'; createBtn.style.marginRight = '10px';
                createBtn.textContent = 'Создать Таб';
                navLinks.insertBefore(createBtn, navLinks.firstChild);
            }
        } catch (e) {}
    }

// Главная страница
// Список табулатур, поиск и фильтрация
    const tabsGrid = document.querySelector('#tabs-grid');
    if (tabsGrid) {
        const filterContainer = document.querySelector('.search-bar');
        if (filterContainer && !document.querySelector('#fav-filter')) {
            const favBtn = document.createElement('button');
            favBtn.id = 'fav-filter'; favBtn.className = 'btn-primary'; favBtn.style.marginLeft = '10px';
            favBtn.style.background = '#6c757d'; favBtn.dataset.active = 'false';
            favBtn.textContent = '❤️ Избранное';
            filterContainer.appendChild(favBtn);

            favBtn.addEventListener('click', () => {
                const isActive = favBtn.dataset.active === 'true';
                favBtn.dataset.active = isActive ? 'false' : 'true';
                favBtn.style.background = isActive ? '#6c757d' : '#dc3545';
                performSearch();
            });
        }

// Получение табулатур с сервера и отображение карточек
        const fetchAndRenderTabs = async (search = '', level = 'any') => {
            try {
                await updateFavoritesList();
                let url = `/api/tabs?search=${encodeURIComponent(search)}&level=${level}`;
                
                if (document.querySelector('#fav-filter')?.dataset.active === 'true') url += `&onlyFavorites=true`;

                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const res = await fetch(url, { headers });
                const tabs = await res.json();

                tabsGrid.innerHTML = '';
                if (tabs.length === 0) { tabsGrid.innerHTML = '<p>Ничего не найдено.</p>'; return; }

                tabs.forEach(tab => {
                    const isFav = myFavorites.includes(String(tab._id));
                    let heartHtml = isFav ? `<div class="fav-icon" data-id="${tab._id}">❤️</div>` : '';
                    const diffMap = { 'beginner': 'Новичок', 'intermediate': 'Средний', 'advanced': 'Продвинутый' };
                    
                    const div = document.createElement('div');
                    div.className = 'tab-card';
                    div.innerHTML = `
                        ${heartHtml}
                        <a href="/tab.html?id=${tab._id}" class="tab-card-link">
                            <div class="card-header"><h3>${tab.title}</h3><span class="access-badge ${tab.access}">${tab.access==='free'?'Бесплатно':'Платно'}</span></div>
                            <p class="artist">${tab.artist}</p>
                            <div style="display: flex; justify-content: space-between;">
                                 <span>Автор: ${tab.author ? tab.author.username : '...'}</span>
                                 <span>${diffMap[tab.difficulty] || ''}</span>
                            </div>
                            ${tab.price > 0 ? `<p class="price-tag">${tab.price} ₽</p>` : ''}
                        </a>`;
                    tabsGrid.appendChild(div);
                });

                document.querySelectorAll('.fav-icon').forEach(icon => {
                    icon.addEventListener('click', async (e) => {
                        e.stopPropagation(); e.preventDefault();
                        const id = icon.dataset.id;
                        const newStatus = await toggleLike(id, null);
                        if (newStatus === false) {
                            icon.remove(); 
                            if (document.querySelector('#fav-filter')?.dataset.active === 'true') icon.closest('.tab-card').remove();
                        }
                    });
                });
            } catch (error) { tabsGrid.innerHTML = '<p>Ошибка загрузки.</p>'; }
        };

// Применение поискового запроса и фильтра по сложности
        const performSearch = () => {
            fetchAndRenderTabs(document.querySelector('#search-input').value, document.querySelector('#filter-level').value);
        };
        document.querySelector('#search-btn')?.addEventListener('click', performSearch);
        document.querySelector('#filter-level')?.addEventListener('change', performSearch);
        fetchAndRenderTabs();
    }

// Страница просмотра
    const tabDetailsContainer = document.querySelector('#tab-details-container');
    if (tabDetailsContainer) {
        const tabId = new URLSearchParams(window.location.search).get('id');

// Преобразование данных табулатуры в HTML-разметку
        function renderTabToHtml(content, timeSignature) {
             if (!content || !content.measures) return '<p>Пустая табулатура</p>';
             const sig = timeSignature || "4/4";
             const [num, den] = sig.split('/');
             
             let html = '<div class="tab-renderer">';
             content.measures.forEach((measure, measureIndex) => {
                html += `<div class="measure"><span class="measure-number">${measureIndex + 1}</span>`;
                if (measureIndex === 0) {
                    html += `<div class="time-signature"><span>${num}</span><span>${den}</span></div>`;
                }
                for (let i = 1; i <= 6; i++) html += `<div class="string-line string-${i}"></div>`;
                if (measure.notes) {
                    const startOffset = measureIndex === 0 ? 30 : 5; 
                    const percentOffset = 100 - startOffset - 5;
                    measure.notes.forEach((note, index) => {
                        const percent = startOffset + (index / measure.notes.length) * percentOffset;
                        const topPosition = 10 + (note.string * 20); 
                        html += `<div class="note-group" style="left: ${percent}%; top: ${topPosition}px;">
                                    <span class="fret-num">${note.fret}</span><div class="stem ${note.duration}"></div></div>`;
                    });
                }
                html += `</div>`; 
             });
             return html + '</div>';
        }
        // Загрузка табулатуры и проверка прав доступа
        const fetchTabData = async () => {
            try {
                await updateFavoritesList();
                const isFav = myFavorites.includes(String(tabId));
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const res = await fetch(`/api/tabs/${tabId}`, { headers });
                // Проверка доступа к приватной табулатуре
                if (res.status === 403) {
                    tabDetailsContainer.innerHTML = '<h1>🔒 Доступ закрыт</h1><p>Это приватная табулатура автора.</p>';
                    return;
                }
                const tab = await res.json();
                const heartHtml = `<span class="single-fav-btn" id="single-fav-btn" title="В избранное">${isFav ? '❤️' : '🤍'}</span>`;
                // Отображение интерфейса покупки для платной табулатуры
                if (tab.isLocked) {
                    tabDetailsContainer.innerHTML = `
                        <h1>${tab.title} ${heartHtml} <span class="access-badge paid">Платно</span></h1>
                        <h2>${tab.artist}</h2>
                        <div class="buy-container" style="padding: 40px; border: 1px solid #ddd; text-align: center;">
                            <h3>Цена: ${tab.price} ₽</h3>
                            <button id="buy-btn" class="btn-primary">Купить</button>
                        </div>
                    `;
                    document.querySelector('#buy-btn').addEventListener('click', async () => {
                        if (!token) return window.location.href = '/login.html';
                        if (confirm(`Купить за ${tab.price} ₽?`)) {
                            await fetch(`/api/tabs/${tabId}/buy`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }});
                            window.location.reload();
                        }
                    });
                } else {
                    let controls = '';
                    if (token) {
                        try {
                            const payload = JSON.parse(atob(token.split('.')[1]));
                            // Управление табулатурой доступно только её автору
                            if (payload.userId === tab.author._id) {
                                const visText = tab.visibility === 'public' ? 'Скрыть' : 'Опубликовать';
                                controls = `<div id="author-controls-panel" style="margin-top:20px; padding:10px; background:#f4f4f4;">
                                    <a href="/edit-tab.html?id=${tabId}" class="btn-primary" style="background:#28a745; margin-right:10px;">Редактировать</a>
                                    <button id="visibility-btn" class="btn-primary">${visText}</button>
                                    <button id="delete-btn" class="btn-danger">Удалить</button>
                                </div>`;
                            }
                        } catch(e){}
                    }
                    tabDetailsContainer.innerHTML = `
                        <h1>${tab.title} ${heartHtml}</h1>
                        <h2>${tab.artist}</h2>
                        <p>Автор: ${tab.author.username}</p>
                        <div class="tab-content">${renderTabToHtml(tab.content, tab.timeSignature)}</div>
                        ${controls}
                    `;

                    document.querySelector('#visibility-btn')?.addEventListener('click', async () => {
                        const newVis = tab.visibility === 'public' ? 'private' : 'public';
                        await fetch(`/api/tabs/${tabId}/visibility`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ visibility: newVis })
                        });
                        window.location.reload();
                    });
                    document.querySelector('#delete-btn')?.addEventListener('click', async () => {
                        if(confirm('Удалить?')) {
                            await fetch(`/api/tabs/${tabId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
                            window.location.href = '/';
                        }
                    });
                }

                document.getElementById('single-fav-btn')?.addEventListener('click', async () => {
                    await toggleLike(tabId, document.getElementById('single-fav-btn'));
                });

            } catch (error) { tabDetailsContainer.innerHTML = `<p>${error.message}</p>`; }
        };
        fetchTabData();
    }

// Регистрация и авторизация пользователей
    const registerForm = document.querySelector('#register-form');
    if (registerForm) {
        // Обработка регистрации нового пользователя
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value,
                    role: document.getElementById('role') ? document.getElementById('role').value : 'user'
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Регистрация успешна!'); window.location.href = '/login.html';
            } else {
                const el = document.querySelector('#error-message'); if(el) el.textContent = data.message;
            }
        });
    }
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
        // Обработка входа пользователя и сохранение JWT-токена
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token); window.location.href = '/';
            } else {
                const el = document.querySelector('#error-message'); if(el) el.textContent = data.message;
            }
        });
    }

   
// Создание и редактирование табулатур
// Визуальный редактор
    const createTabForm = document.querySelector('#create-tab-form');
    const editTabForm = document.querySelector('#edit-tab-form');
    
    if (createTabForm || editTabForm) {
        const editorContainer = document.getElementById('visual-editor');
        const modal = document.getElementById('ts-modal');
        const hiddenTsInput = document.getElementById('time-signature');
        
        let measureCount = 0;
        let currentDuration = 'q'; // По умолчанию - четверть
        let activeNum = 4;
        let activeDen = 4;

// Вспомогательные функции для расчёта длительности нот

// Получение числового значения длительности ноты
        function getDurationValue(dur) {
            switch(dur) {
                case 'w': return 1.0;  // Целая
                case 'h': return 0.5;  // Половинная
                case 'q': return 0.25; // Четвертная
                case 'e': return 0.125;// Восьмая
                default: return 0.25;
            }
        }

// Определение максимальной длительности такта на основе музыкального размера
        function getMaxCapacity(timeSignature) {
            if (!timeSignature) return 1.0;
            const [num, den] = timeSignature.split('/').map(Number);
            return num / den; // Например, 4/4 = 1.0, 3/4 = 0.75, 6/8 = 0.75
        }

// Расчёт общей длительности нот внутри такта
        function getMeasureDuration(measureDiv) {
            const inputs = measureDiv.querySelectorAll('.note-input');
            const beatDurations = {}; // beat_index -> max_duration

            inputs.forEach(input => {
                const val = input.value.trim();
                if (val !== '' && !isNaN(val)) {
                    const beat = input.dataset.beat;
                    const dur = input.dataset.duration || 'q';
                    const durVal = getDurationValue(dur);
                    
                   // Для аккордов беру только максимальную длительность на этой доле
                    if (!beatDurations[beat] || durVal > beatDurations[beat]) {
                        beatDurations[beat] = durVal;
                    }
                }
            });

            let total = 0;
            for (const beat in beatDurations) {
                total += beatDurations[beat];
            }
            return total;
        }

        function getBeatsLimit() {
            if (!hiddenTsInput) return 8; 
            const signature = hiddenTsInput.value;
            switch(signature) {
                case '3/4': return 6;
                case '2/4': return 4;
                case '6/8': return 6;
                case '4/4':
                default: return 8;
            }
        }

        function openTSModal() {
            if (!hiddenTsInput) return;
            const [num, den] = hiddenTsInput.value.split('/');
            activeNum = parseInt(num);
            activeDen = parseInt(den);

            document.getElementById('ts-num-val').textContent = activeNum;
            document.getElementById('ts-den-val').textContent = activeDen;

            modal.style.display = 'flex';
        }
        // Создание визуального такта и заполнение его существующими нотами
        function addMeasure(initialNotes = [], measureIdFromContent = 0) {
            measureCount++;
            const measureDiv = document.createElement('div');
            measureDiv.className = 'editor-measure';
            measureDiv.dataset.id = measureCount;

            const beats = getBeatsLimit(); 
            const isFirst = measureCount === 1;

            // Настройка ширины такта
            const baseWidth = beats * 35;
            measureDiv.style.width = `${isFirst ? baseWidth + 80 : baseWidth}px`; 

            for (let s = 1; s <= 6; s++) {
                const line = document.createElement('div');
                line.className = 'editor-string-line';
                line.style.top = `${s * 20}px`;
                measureDiv.appendChild(line);
            }

            // Рисую подписи струн
            if (isFirst) {
                const namesDiv = document.createElement('div');
                namesDiv.className = 'string-names';
                namesDiv.innerHTML = `
                    <span class="string-name s1">e</span>
                    <span class="string-name s2">B</span>
                    <span class="string-name s3">G</span>
                    <span class="string-name s4">D</span>
                    <span class="string-name s5">A</span>
                    <span class="string-name s6">E</span>
                `;
                measureDiv.appendChild(namesDiv);

                const [num, den] = hiddenTsInput.value.split('/');
                const tsDiv = document.createElement('div');
                tsDiv.className = 'time-signature clickable-ts';
                tsDiv.innerHTML = `<span>${num}</span><span>${den}</span>`;
                tsDiv.addEventListener('click', openTSModal);
                measureDiv.appendChild(tsDiv);
            }

            const startOffset = isFirst ? 30 : 0;
            const availableWidth = 100 - startOffset - 5; 

            for (let string = 1; string <= 6; string++) {
                for (let beat = 0; beat < beats; beat++) {
                    const input = document.createElement('input');
                    input.type = 'text'; input.className = 'note-input'; input.maxLength = 2; input.placeholder = " ";
                    
                    const top = (string * 20) - 10; 
                    const leftPercent = startOffset + (beat / beats) * availableWidth;
                    input.style.top = `${top}px`; input.style.left = `${leftPercent}%`;
                    input.style.width = `${availableWidth / beats}%`;
                    input.dataset.string = string;
                    input.dataset.beat = beat;

                    const noteToFill = initialNotes.find(note => 
                        parseInt(note.string) === string && parseInt(note.beat) === beat
                    );
                    if (noteToFill) {
                        input.value = noteToFill.fret;
                        input.dataset.duration = noteToFill.duration;
                    }

                    // Валидация введённых нот и контроль длительности такта
                    input.addEventListener('input', (e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        e.target.value = val;
                        
                        if (val.trim() !== '') {
                            const oldDuration = input.dataset.duration;
                            input.dataset.duration = currentDuration; // Применяю выбранную длительность перед проверкой заполненности такта

                            const currentTotal = getMeasureDuration(measureDiv);
                            const maxCapacity = getMaxCapacity(hiddenTsInput.value);

                            if (currentTotal > maxCapacity) {
                                alert(`Невозможно добавить ноту! Превышена длительность такта для размера ${hiddenTsInput.value} (максимум ${maxCapacity}).`);
                                e.target.value = ''; 
                                if (oldDuration) {
                                    input.dataset.duration = oldDuration;
                                } else {
                                    delete input.dataset.duration;
                                }
                            }
                        } else {
                            delete input.dataset.duration;
                        }
                    });

                    // Изменение длительности существующей ноты с проверкой заполненности такта
                    input.addEventListener('click', () => {
                        if (input.value.trim() !== '') {
                            const oldDuration = input.dataset.duration;
                            input.dataset.duration = currentDuration; // Применяю выбранную длительность перед проверкой такта

                            const currentTotal = getMeasureDuration(measureDiv);
                            const maxCapacity = getMaxCapacity(hiddenTsInput.value);

                            if (currentTotal > maxCapacity) {
                                alert(`Невозможно изменить длительность! Превышен лимит такта для размера ${hiddenTsInput.value} (максимум ${maxCapacity}).`);
                                input.dataset.duration = oldDuration; 
                            } else {
                                // Временно подсвечиваю изменённую ноту
                                input.style.backgroundColor = '#e8f0fe';
                                setTimeout(() => { input.style.backgroundColor = 'white'; }, 300);
                            }
                        }
                    });
                    
                    measureDiv.appendChild(input);
                }
            }
            editorContainer.appendChild(measureDiv);
            return measureDiv;
        }

// Преобразование данных из визуального редактора в структуру для отправки на сервер
        function collectDataFromEditor() {
            const measures = [];
            const measureDivs = document.querySelectorAll('.editor-measure');
            const beats = getBeatsLimit();
            measureDivs.forEach((mDiv, index) => {
                const inputs = mDiv.querySelectorAll('.note-input');
                const notes = [];
                for(let beat = 0; beat < beats; beat++) {
                    for(let string = 1; string <= 6; string++) {
                        const input = Array.from(inputs).find(inp => 
                            parseInt(inp.dataset.string) === string && parseInt(inp.dataset.beat) === beat
                        );
                        if(input && input.value.trim() !== '' && !isNaN(input.value.trim())) {
                            notes.push({
                                string: parseInt(input.dataset.string),
                                fret: parseInt(input.value.trim()),
                                duration: input.dataset.duration || 'q',
                                beat: parseInt(input.dataset.beat)
                            });
                        }
                    }
                }
                if (notes.length > 0) {
                    measures.push({ id: index + 1, notes: notes });
                }
            });
            return { measures: measures };
        }

// Управление выбором длительности нот в панели редактора
        const durBtns = document.querySelectorAll('.dur-btn');
        durBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                durBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentDuration = btn.dataset.val; // Сохраняю выбранную длительность для новых нот
            });
        });

// Обработчики изменения музыкального размера
        const numMinus = document.getElementById('ts-num-minus');
        if (numMinus) {
            numMinus.addEventListener('click', () => {
                if (activeNum > 1) {
                    activeNum--;
                    document.getElementById('ts-num-val').textContent = activeNum;
                }
            });
        }

        const numPlus = document.getElementById('ts-num-plus');
        if (numPlus) {
            numPlus.addEventListener('click', () => {
                if (activeNum < 16) {
                    activeNum++;
                    document.getElementById('ts-num-val').textContent = activeNum;
                }
            });
        }

        const denMinus = document.getElementById('ts-den-minus');
        if (denMinus) {
            denMinus.addEventListener('click', () => {
                if (activeDen === 16) activeDen = 8;
                else if (activeDen === 8) activeDen = 4;
                else if (activeDen === 4) activeDen = 2;
                document.getElementById('ts-den-val').textContent = activeDen;
            });
        }

        const denPlus = document.getElementById('ts-den-plus');
        if (denPlus) {
            denPlus.addEventListener('click', () => {
                if (activeDen === 2) activeDen = 4;
                else if (activeDen === 4) activeDen = 8;
                else if (activeDen === 8) activeDen = 16;
                document.getElementById('ts-den-val').textContent = activeDen;
            });
        }

        const cancelBtn = document.getElementById('ts-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        const applyBtn = document.getElementById('ts-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const newTS = `${activeNum}/${activeDen}`;
                hiddenTsInput.value = newTS;

                const savedContent = collectDataFromEditor();
                editorContainer.innerHTML = '';
                
                const finalMeasuresCount = Math.max(measureCount, 4);
                measureCount = 0;

                for (let m = 1; m <= finalMeasuresCount; m++) {
                    const oldMeasureNotes = savedContent.measures.find(mObj => mObj.id === m)?.notes || [];
                    addMeasure(oldMeasureNotes);
                }

                modal.style.display = 'none';
            });
        }

// Логика страницы создания новой табулатуры
        if (createTabForm) {
            if (createTabForm.id === 'create-tab-form') {
                addMeasure(); addMeasure(); addMeasure(); addMeasure();
            }

            document.getElementById('add-measure-btn').addEventListener('click', () => { addMeasure(); });
            document.getElementById('clear-editor-btn').addEventListener('click', () => {
                editorContainer.innerHTML = ''; measureCount = 0; addMeasure();
            });

            createTabForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const contentObject = collectDataFromEditor();
                if (contentObject.measures.length === 0) return alert('Табулатура пустая! Впишите цифры.');

                const tabData = {
                    title: document.getElementById('title').value,
                    artist: document.getElementById('artist').value,
                    difficulty: document.getElementById('difficulty').value,
                    visibility: document.getElementById('visibility').value,
                    access: document.getElementById('access').value,
                    price: document.getElementById('access').value === 'paid' ? document.getElementById('price').value : 0,
                    timeSignature: hiddenTsInput.value,
                    content: contentObject
                };

                try {
                    const res = await fetch('/api/tabs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(tabData)
                    });
                    if (res.ok) {
                        alert('Успешно создано!'); window.location.href = '/';
                    } else {
                        const data = await res.json();
                        document.getElementById('error-message').textContent = data.message;
                    }
                } catch (error) {
                    document.getElementById('error-message').textContent = 'Ошибка сервера';
                }
            });
        }

// Логика страницы редактирования табулатуры
        if (editTabForm) {
            const tabId = new URLSearchParams(window.location.search).get('id');

            async function loadAndFillEditor() {
                if (!token) return window.location.href = '/login.html';
                
                try {
                    const res = await fetch(`/api/tabs/${tabId}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const tab = await res.json();
                    
                    document.getElementById('title').value = tab.title;
                    document.getElementById('artist').value = tab.artist;
                    document.getElementById('difficulty').value = tab.difficulty;
                    document.getElementById('visibility').value = tab.visibility;
                    document.getElementById('access').value = tab.access;
                    
                    hiddenTsInput.value = tab.timeSignature || '4/4';

                    if (tab.access === 'paid') {
                        document.getElementById('price').value = tab.price;
                        document.getElementById('price-group').style.display = 'block';
                    } else {
                        document.getElementById('price-group').style.display = 'none';
                    }

                    editorContainer.innerHTML = ''; 
                    let maxMeasureId = 0;
                    
                    if (tab.content && tab.content.measures) {
                        tab.content.measures.forEach(measureData => {
                            maxMeasureId = Math.max(maxMeasureId, measureData.id);
                            addMeasure(measureData.notes, measureData.id); 
                        });
                    }
                    if (maxMeasureId === 0) {
                        addMeasure(); addMeasure(); addMeasure(); addMeasure();
                    }

                } catch (error) {
                    console.error('Ошибка загрузки данных для редактирования:', error);
                    alert('Не удалось загрузить табулатуру.');
                }
            }
            
            loadAndFillEditor();

            document.getElementById('add-measure-btn').addEventListener('click', () => { addMeasure(); });
            document.getElementById('clear-editor-btn').addEventListener('click', () => {
                editorContainer.innerHTML = ''; measureCount = 0; addMeasure();
            });

            editTabForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!token) return window.location.href = '/login.html';
                
                const contentObject = collectDataFromEditor();
                if (contentObject.measures.length === 0) return alert('Табулатура пустая!');

                const tabData = {
                    title: document.getElementById('title').value,
                    artist: document.getElementById('artist').value,
                    difficulty: document.getElementById('difficulty').value,
                    visibility: document.getElementById('visibility').value,
                    access: document.getElementById('access').value,
                    price: document.getElementById('access').value === 'paid' ? document.getElementById('price').value : 0,
                    timeSignature: hiddenTsInput.value,
                    content: contentObject
                };

                try {
                    const res = await fetch(`/api/tabs/${tabId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(tabData)
                    });
                    if (res.ok) {
                        alert('Изменения сохранены!'); window.location.href = `/tab.html?id=${tabId}`;
                    } else {
                        const data = await res.json();
                        document.getElementById('error-message').textContent = data.message;
                    }
                } catch (error) {
                    document.getElementById('error-message').textContent = 'Ошибка сервера';
                }
            });
        }
    }
});