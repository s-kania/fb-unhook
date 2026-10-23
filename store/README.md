# Materiały do Edge Add-ons — 0.7.2

## Zapis zgłoszenia

Według [notatki z 22 października 2026](submission-2026-10-22.md) wersja 0.7.2 została przesłana do Microsoft Edge Add-ons i miała status **In review**. Wybrano widoczność **Public** oraz języki angielski i polski. Jest to stan odnotowany w dniu zgłoszenia; aktualny status należy sprawdzić w Partner Center.

W formularzu podano [angielską politykę prywatności](https://brickfiction.pl/en/facebook-unhook/privacy/). Dostępna jest też [wersja polska](https://brickfiction.pl/facebook-unhook/privacy/). Kontakt pomocy: jsnetic@outlook.com.

## Pliki

| Materiał | Przeznaczenie |
| --- | --- |
| [listing-pl.md](listing-pl.md), [listing-en.md](listing-en.md) | Edytowalne opisy sklepu i pozostałe pola formularza. |
| [reviewer-notes.md](reviewer-notes.md) | Pełna instrukcja testowania, opis uprawnień i przetwarzania danych dla recenzentów. |
| [submission-2026-10-22.md](submission-2026-10-22.md) | Historyczny zapis zgłoszenia, identyfikatory produktu i dokładna treść przesłanych uwag. |
| [assets/](assets/) | Logo i polskie grafiki promocyjne. |
| [site/](site/) | Kopia polityki prywatności i pomocy w obu językach, zgodna z plikami w rozszerzeniu. |

Opisy i pełne notatki dla recenzentów są materiałami do kolejnej edycji zgłoszenia. Ich zmiana w repozytorium nie aktualizuje formularza ani karty sklepu. Treść faktycznie przesłanych uwag pozostaje w datowanej notatce.

## Budowa paczki

Wymagania i zasady pracy nad kodem: [AGENTS.md](../AGENTS.md).

```sh
npm ci --ignore-scripts
npm run verify
```

Polecenia uruchamiaj z katalogu głównego repozytorium. `verify` sprawdza składnię, uruchamia testy i buduje paczkę. Samo pakowanie wykonuje `npm run package`.

Dla wersji 0.7.2 wynik to `dist/facebook-unhook-0.7.2-edge.zip` i plik `.zip.sha256`. ZIP zawiera manifest w katalogu głównym oraz wyłącznie pliki produkcyjne z listy w [scripts/package.py](../scripts/package.py). Nie zawiera dokumentacji, testów, danych użytkownika ani zależności npm. Archiwa w katalogu głównym pochodzą ze starszych wydań.

## Grafiki

- [logo-300.png](assets/logo-300.png): wspólne logo, 300×300 px.
- [promo-small-440x280.png](assets/promo-small-440x280.png): polski kafelek, 440×280 px.
- [promo-large-1400x560.png](assets/promo-large-1400x560.png): polski kafelek, 1400×560 px.

Kafelki są grafikami promocyjnymi, a nie zrzutami działającego Facebooka. Do angielskiej karty używaj samego logo, dopóki nie powstaną angielskie kafelki. Repozytorium nie zawiera zrzutów przeznaczonych do sklepu.

## Kolejne aktualizacje zgłoszenia

1. Sprawdź aktualny status i ewentualne uwagi recenzenta w Partner Center.
2. Przy zmianie rozszerzenia uaktualnij wersję, wykonaj `npm run verify` i sprawdź ręcznie zmienione zachowanie w Edge.
3. Uzgodnij oba opisy sklepu, instrukcję dla recenzenta i deklaracje danych z przygotowanym wydaniem. Jeśli zmienia się polityka prywatności, uaktualnij również publiczną stronę.
4. W Partner Center sprawdź paczkę, opisy obu języków, grafiki, widoczność, rynki i publiczny adres polityki. Przed ponownym zgłoszeniem sprawdź podgląd.
5. Po wysłaniu zapisz datę, wersję, potwierdzony status i treść przesłanych uwag w nowej notatce. Nie nadpisuj historycznego zapisu poprzedniego zgłoszenia. Po publikacji dodaj link do karty sklepu w głównym README.

Do testów wymagane jest konto Facebooka z członkostwem w grupie. Nie zapisuj danych logowania w repozytorium; recenzent powinien użyć autoryzowanego konta testowego zgodnie z instrukcją w `reviewer-notes.md`.

Instalacja sklepowa może mieć inny identyfikator niż rozpakowana kopia. Wykonaj świeży odczyt grup i unikaj równoczesnego działania obu kopii na tej samej stronie.

## Dokumentacja Microsoft

Przed kolejnym zgłoszeniem sprawdź aktualne wymagania w dokumentacji:

- [Publikowanie rozszerzenia](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- [Konto wydawcy](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)
- [Zasady dla rozszerzeń](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)
