# Pakiet publikacyjny Edge — 0.7.2

## Budowa

Wymagania: Node.js 22 lub nowszy, npm i Python 3 (standardowa biblioteka).

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run package
```

Wynik: `dist/facebook-unhook-0.7.2-edge.zip` i plik SHA-256. ZIP zawiera `manifest.json` bezpośrednio w katalogu głównym, tylko produkcyjne pliki z jawnej listy, bez testów, dokumentacji, `.git`, danych użytkownika lub zależności npm. To plik do przesłania w Partner Center. Historyczne ZIP-y w katalogu głównym nie są paczkami tego wydania.

## Materiały

- `listing-pl.md` i `listing-en.md`: polski i angielski opis karty sklepu.
- `reviewer-notes.md`: angielskie instrukcje dla certyfikacji, uprawnienia i opis przetwarzania danych.
- `assets/`: logo i opcjonalne kafelki promocyjne. Są to grafiki promocyjne, nie zrzuty działającego Facebooka.
- `site/privacy.html`, `site/privacy-en.html` i `site/privacy.css`: gotowa statyczna polityka prywatności i instrukcja obsługi, bez zewnętrznych skryptów i trackerów. Treść odpowiada stronie dołączonej do rozszerzenia.
- `validation.md`: zakres wykonanych kontroli wydania.

## Pozostałe kroki przed wysłaniem do sklepu

1. Zarejestrować/zweryfikować konto wydawcy w Microsoft Partner Center i zaakceptować umowę osobiście.
2. Wpisać publiczny kontakt jsnetic@outlook.com w formularzu sklepu. Adres zatwierdzony przez właściciela jest już w obu wersjach polityki.
3. Umieścić wyłącznie pliki `site/` na wybranym publicznym hostingu HTTPS i sprawdzić ich dostępność bez logowania. Repozytorium źródłowe ma pozostać prywatne. Nie podawać jako polityki adresu prywatnego repo ani lokalnego pliku.
4. Przejrzeć nazwę i identyfikację produktu pod kątem odróżnienia od innych rozszerzeń. Opisy już wskazują brak powiązania z Meta i Unhook dla YouTube; samo zastrzeżenie nie zastępuje oceny praw do marki.
5. Utworzyć zgłoszenie, przesłać ZIP i materiały, ustalić rynki/obsługiwane platformy, wypełnić deklaracje danych zgodnie z bieżącymi definicjami formularza oraz przekazać instrukcje testowania. W razie potrzeby przygotować osobne konto testowe Facebooka.
6. Sprawdzić podgląd i dopiero wtedy wysłać do certyfikacji. Te przygotowania nie oznaczają wysłania ani opublikowania rozszerzenia.

Instalacja sklepowa może mieć inny identyfikator niż obecna rozpakowana kopia. Nie zakładać automatycznego przeniesienia lokalnych ustawień: wykonać świeżą synchronizację i nie pozostawiać równocześnie dwóch aktywnych kopii filtrujących tę samą stronę.

## Źródła wymagań (sprawdzone 22.10.2026)

- https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account
- https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies

Logo: minimum 128×128, zalecane 300×300; kafelki opcjonalne: 440×280 i 1400×560. Zrzuty opcjonalne: 640×480 lub 1280×800. Stary `docs/menu-preview.png` pokazuje historyczne menu z usuniętą pauzą i nie jest materiałem sklepowym.
