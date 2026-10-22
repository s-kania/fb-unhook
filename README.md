# Facebook Unhook — Edge, wersja 0.7.2

Rozszerzenie pozostawia w głównych aktualnościach Facebooka i w feedzie grup tylko posty pochodzące z zapisanych grup. Menu jest po polsku. Dane są przechowywane wyłącznie w `chrome.storage.local`; rozszerzenie nie ma serwera, analityki, dostępu do haseł ani uprawnień do innych domen.

## Instalacja

1. Otwórz `edge://extensions` w Microsoft Edge.
2. Włącz **Tryb dewelopera**.
3. Kliknij **Załaduj rozpakowane** i wskaż folder `extension` w tym projekcie.
4. Odśwież istniejące karty Facebooka. Przypnij Facebook Unhook do paska rozszerzeń.
5. W menu Facebook Unhook kliknij **Aktualizuj** w sekcji **Moje grupy**.
6. Pozostaw otwartą nową kartę „Twoje grupy”. Rozszerzenie przewija listę, odczytuje numeryczne ID z danych tej strony i porównuje liczbę kompletnych rekordów z nagłówkiem Facebooka. Aktualizacja korzysta tylko z tej strony i nie otwiera poszczególnych grup. Gdy menu pokaże nową datę ostatniej aktualizacji, wróć do aktualności.

Bez zapisanej listy filtr ukrywa wszystkie rozpoznane posty. Wyłączenie „Tylko moje grupy” przywraca posty. Filtr grup nie dotyka pojedynczych stron grup, profili, postów, Messengera ani Marketplace.

## Sterowanie

- **Włącz rozszerzenie** i **Tylko moje grupy** działają bez przeładowania karty.
- **Aktualizuj** zastępuje listę dopiero po kompletnym odczycie; niekompletny odczyt jej nie zmienia. Odświeżaj ją po dołączeniu do grupy lub jej opuszczeniu i po zmianie konta Facebooka. Lista należy do profilu przeglądarki, nie do konta Facebooka.
- **Dodaj grupę ręcznie** przyjmuje link z nazwą lub numerem grupy. Pełna aktualizacja zastąpi również ręczne wpisy.
- Przełącznik przy każdej grupie w sekcji **Moje grupy** steruje widocznością jej postów. Wszystkie grupy są domyślnie włączone. Wyłączenie nie usuwa członkostwa, a pełna aktualizacja listy zachowuje ten wybór.
- Przełącznik **Grupa** obok „X” przy poście ukrywa wszystkie posty tej grupy. Przywrócisz je przełącznikiem w menu rozszerzenia.
- **Ukryj pasek tworzenia posta** usuwa „O czym myślisz?” z aktualności.
- **Ukryj rolki** usuwa rozpoznane karuzele i posty rolek z aktualności oraz odnośniki do rolek z nawigacji.
- **Ukryj relacje** usuwa pasek relacji nad aktualnościami.
- **Ukryj lewy panel** zastępuje boczną nawigację małym panelem Facebook Unhook z liczbą włączonych grup i licznikami postów. Panel korzysta z kolorów Facebooka i dostosowuje się do jasnego lub ciemnego motywu. Na wąskim ekranie, bez bocznej kolumny, nie zasłania aktualności.
- **Ukryj moje skróty** działa niezależnie: po przywróceniu lewego panelu można nadal ukrywać samą sekcję „Twoje skróty”.
- **Ukryj kontakty** usuwa całą sekcję kontaktów po prawej, razem z nagłówkiem, wyszukiwaniem, menu, rozwiniętą listą i czatami grupowymi.
- W aktualnościach animowany wskaźnik sygnalizuje oczekiwanie na pierwsze i kolejne posty. Loader to małe animowane kółko bez tła i ramki. Liczba w środku kółka rośnie wraz z pojawianiem się postów, także ukrytych przez filtr. Każdy nowy kontener z nagłówkiem posta jest liczony raz; usunięcie starszych kontenerów nie zmniejsza licznika. Licznik zeruje się po odświeżeniu lub zmianie widoku aktualności. Panel boczny nie pokazuje wskaźnika ładowania. Animacje respektują ustawienie ograniczenia ruchu; po 20 sekundach bez nowych treści wskaźnik znika.
- **Ukryj przycisk wiadomości** usuwa pływający przycisk „Nowa wiadomość” w prawym dolnym rogu.
- **Uprość górną nawigację** pozostawia Stronę główną i Marketplace. Logo, wyszukiwarka i przyciski konta pozostają dostępne.
- Nowe opcje są domyślnie włączone. Każda działa bez przeładowania strony, a główny wyłącznik przywraca cały oryginalny widok. Pauza została usunięta.

## Zakres i ograniczenia

- Odczyt listy obsługuje polski i angielski nagłówek widoku „Twoje grupy”. Odczytuje osadzone dane JSON oraz odpowiedzi już pobierane przez Facebooka podczas przewijania tej strony. Nie wysyła własnych zapytań API, nie odtwarza żądań i nie odczytuje ciasteczek ani tokenów sesji. Z odpowiedzi zachowuje tylko rekordy członkostw: ID, URL i nazwę; pozostałe dane nie są zapisywane.
- Post musi mieć rozpoznany nagłówek z linkiem do dozwolonej grupy. Sam link w treści lub w komentarzu nie wystarczy. Nierozpoznane źródła są ukrywane.
- Każda grupa po pełnej aktualizacji ma numeryczne ID, nawet jeśli jej link na liście ma nazwę tekstową. Dopasowanie ID–URL pochodzi z tego samego rekordu `all_joined_groups.tab_groups_list` ze statusem `MEMBER`, a URL jest porównywany z widoczną listą. Nazwa służy tylko do wyświetlania. Brakujące lub sprzeczne ID blokują zastąpienie poprzedniej listy. Nie trzeba czekać na post z dwoma wariantami adresu.
- Uczenie dodatkowych adresów z nagłówków postów pozostaje mechanizmem pomocniczym. Podstawą członkostwa jest kompletna lista „Twoje grupy”. Wyłączenia grup i dotychczasowe adresy są zachowywane przy przejściu na numeryczne ID.
- Czytnik danych strony działa tylko w dokumencie „Twoje grupy”, od początku jego ładowania. Jeżeli Facebook zmieni format danych, aktualizacja może pozostać niekompletna; zapisane członkostwa pozostają wtedy bez zmian.
- Filtr obejmuje kontenery postów; osobne opcje sterują relacjami, rolkami i nawigacją. Reklamy poza feedem pozostają na stronie. Rozszerzenie nie zapewnia kompletnego ani chronologicznego zestawu postów — pokazuje tylko treści załadowane przez Facebooka.
- Arkusz stylów ładowany na początku dokumentu zasłania treść do wczytania ustawień i pierwszego sprawdzenia. Nowe kontenery postów pozostają niewidoczne do sklasyfikowania, a zmiany w ponownie użytych kontenerach są sprawdzane przed kolejnym rysowaniem strony. Nie trzeba pokazywać pełnoekranowego ekranu ładowania. Dotyczy rozpoznawanych kontenerów Facebooka; zmiany struktury strony mogą wymagać aktualizacji.
- Ukryte posty znikają całkowicie, bez komunikatów ani pustych pasków. Kontenery doładowywania Facebooka pozostają nietknięte; rozszerzenie nie przewija samo feedu i nie pobiera postów w tle.
- Zmiana struktury Facebooka może wymagać aktualizacji selektorów w `core.js` i `layout.js`. Menu sygnalizuje brak rozpoznanych postów. Wyłączenie filtra przywraca oryginalne elementy.
- Nie uruchamiaj równocześnie ręcznej edycji listy i pełnej aktualizacji: pełny odczyt jest źródłem aktualnego członkostwa i zastępuje listę.

## Rozwój i testy

Rozszerzenie działa bez budowania i bez zależności produkcyjnych. Folder `extension` jest kompletnym pakietem do instalacji.

```sh
npm ci --ignore-scripts
npm run check
npm test
```

Testy korzystają z syntetycznych przykładów HTML, bez prywatnych postów lub listy grup użytkownika. Obejmują rozpoznawanie źródła postów, odrzucanie rekomendowanych grup, dynamiczne doładowywanie, przełączniki, nawigację SPA kompletność i bezpieczeństwo aktualizacji listy oraz niezależne ukrywanie i przywracanie elementów interfejsu.

Jeżeli po restarcie lub odmowie dostępu do Dokumentów lokalne rozszerzenie zniknie z Edge, ponownie użyj **Załaduj rozpakowane** i wskaż ten sam folder `extension`. Nie usuwaj ani nie przenoś folderu, z którego Edge ładuje rozszerzenie. Ponowne wskazanie tego samego katalogu pozwoliło odzyskać dotychczasowe ustawienia; nie wymagało włączenia dostępu do całych Dokumentów ani Pobranych.

Po zmianie kodu kliknij **Załaduj ponownie** na karcie rozszerzenia w Edge, a następnie odśwież Facebooka.

## Publikacja

Materiały, instrukcja zgłoszenia i lista pozostałych kroków: [store/README.md](store/README.md). Pakiet sklepu buduje `npm run package`; wynik trafia do `dist/`. Kod jest przechowywany w prywatnym repozytorium. Rozszerzenie pozostaje bezpłatne, bez wpłat i funkcji Premium.

### Język interfejsu

Ikona globu w menu pozwala wybrać English, Polski lub Automatycznie. Domyślnie używany jest język interfejsu przeglądarki (`chrome.i18n.getUILanguage()`): polski dla `pl`, angielski dla pozostałych języków. Ręczny wybór zapisuje się lokalnie; zmienia menu, panel Facebook Unhook i kontrolki postów bez ponownego odczytu grup. Nie zmienia języka Facebooka. Polityka i pomoc są dostępne w obu językach. Kontakt: jsnetic@outlook.com.
