# Facebook Unhook

Bezpłatne rozszerzenie do Microsoft Edge, które ogranicza aktualności Facebooka do wybranych grup i pozwala ukryć rozpraszające elementy strony. Działa na komputerze, z menu po polsku i angielsku.

## Możliwości

- Filtrowanie strony głównej i aktualności grup według zapisanej listy członkostw.
- Włączanie i wyłączanie postów poszczególnych grup bez opuszczania tych grup.
- Niezależne ukrywanie rolek, relacji, paska tworzenia posta, kontaktów, przycisku wiadomości i skrótów.
- Zastąpienie lewego menu kompaktowym panelem oraz uproszczenie górnej nawigacji.
- Zmiana ustawień bez przeładowywania strony; główny wyłącznik przywraca oryginalny widok.

## Instalacja z repozytorium

1. Otwórz `edge://extensions` w Microsoft Edge.
2. Włącz **Tryb dewelopera**.
3. Kliknij **Załaduj rozpakowane** i wskaż folder `extension` w tym projekcie. Instalacja nie wymaga budowania ani instalowania zależności.
4. Odśwież istniejące karty Facebooka i przypnij rozszerzenie do paska.
5. Otwórz menu rozszerzenia i kliknij **Odczytaj moje grupy** lub **Aktualizuj**.
6. Pozostaw nową kartę „Twoje grupy” otwartą i aktywną do zakończenia odczytu. Lista przewija się automatycznie; rozszerzenie nie otwiera poszczególnych grup. Po pojawieniu się daty ostatniej aktualizacji wróć do aktualności.

Bez zapisanej listy filtr ukrywa rozpoznane posty. Aby je przywrócić, wyłącz **Tylko moje grupy**.

Nie przenoś ani nie usuwaj folderu, z którego Edge ładuje rozszerzenie. Po aktualizacji plików kliknij **Załaduj ponownie** na karcie rozszerzenia i odśwież Facebooka. Jeśli rozszerzenie zniknie z Edge, ponownie wskaż ten sam folder przez **Załaduj rozpakowane**.

## Używanie

Przełączniki w sekcji **Moje grupy** wybierają grupy widoczne w aktualnościach. Przełącznik **Grupa** obok „X” przy poście ukrywa posty danej grupy; przywrócisz je w menu rozszerzenia. Nie zmienia to członkostwa na Facebooku.

Odśwież listę po dołączeniu do grupy, jej opuszczeniu lub zmianie konta Facebooka. Lista jest przypisana do profilu przeglądarki, a nie do konta. Pełna aktualizacja zachowuje wybór widocznych grup; przerwany lub niekompletny odczyt pozostawia poprzednią listę.

**Dodaj grupę ręcznie** przyjmuje link z nazwą lub numerem grupy. Kolejna pełna aktualizacja zastępuje również ręczne wpisy. Nie edytuj listy ręcznie podczas odczytu.

Opcje wyglądu są domyślnie włączone i działają niezależnie od filtra grup. Kółko ładowania pokazuje liczbę załadowanych postów, także ukrytych przez filtr — nie procent postępu pobierania.

Ikona globu pozwala wybrać **English**, **Polski** lub **Automatycznie**. Tryb automatyczny wybiera polski dla przeglądarki w języku polskim, a angielski dla pozostałych. Wybór zapisuje się lokalnie i nie zmienia języka Facebooka.

## Ograniczenia

- Filtr postów działa w głównych aktualnościach i aktualnościach grup. Nie filtruje pojedynczych stron grup, profili, postów, Messengera ani Marketplace. Opcje wyglądu mają własny zakres działania.
- Pokazuje tylko treści załadowane przez Facebooka; nie zapewnia kompletnej ani chronologicznej listy postów. Reklamy poza aktualnościami mogą pozostać widoczne.
- Posty o nierozpoznanym źródle są ukrywane. Zmiany w strukturze Facebooka mogą wymagać aktualizacji rozszerzenia. W razie problemów wyłącz filtr lub całe rozszerzenie.
- Rozpoznawanie interfejsu Facebooka obsługuje polski i angielski. Rozszerzenie jest przeznaczone do komputerowej wersji strony.

## Prywatność

Ustawienia oraz nazwy, identyfikatory i adresy grup są przechowywane wyłącznie lokalnie w profilu przeglądarki. Rozszerzenie odczytuje zawartość strony potrzebną do filtrowania i synchronizacji grup. Nie wysyła tych danych do autora, nie ma serwera ani analityki i nie odczytuje haseł, ciasteczek ani tokenów sesji.

Szczegóły: [prywatność i pomoc po polsku](extension/privacy.html) oraz [privacy and help in English](extension/privacy-en.html).

## Praca nad projektem

Instrukcje dla osób i agentów zmieniających kod, opis modułów oraz polecenia testowania i pakowania: [AGENTS.md](AGENTS.md). Materiały do publikacji w Edge Add-ons: [store/README.md](store/README.md).

Kontakt: jsnetic@outlook.com.
