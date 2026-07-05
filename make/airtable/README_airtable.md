# ארכיטקטורה A — Airtable כמקור אמת, מוטמע בדשבורד

מקור אמת אחד (Airtable) שגם ה-Make קורא ממנו וגם אתה עורך דרכו — מתוך הדשבורד
עצמו (iframe). אין backend לבנות, אין הרשאות כתיבה בקוד הסטטי.

```
        עריכה (אתה)                     קריאה (אוטומציה)
   Dashboard  ──iframe──►  Airtable  ◄──native module──  Make (check_availability)
```

## ✅ 1) ה-Base כבר נבנה אוטומטית (API)

| | מזהה |
|---|---|
| Base | `appVRL6NLQCYLTpxZ` |
| טבלה `Weekly Schedule` | `tblgPrrTAghUEjg94` |
| טבלה `Exceptions` | `tblz5sK3fOV2acPJE` |

שתי הטבלאות מלאות (7 + 27 שורות), עם סוגי שדות מוגדרים (Single select למיקום/סטטוס,
Date לתאריך, Checkbox ל-active). ה-CSV להלן נשמרים לגיבוי/ייבוא-חוזר בלבד.

<details><summary>סכימת השדות (לעיון)</summary>

### טבלה `Weekly Schedule` (ייבוא: `weekly_schedule.csv`)
| שדה | סוג מומלץ | הערה |
|-----|-----------|------|
| `weekday` | Single select (sunday…saturday) | **מפתח** — לא לשנות ערכים |
| `location_key` | Single select (rishon / bnei) | לא לשנות |
| `location_code` | Number (11 / 1) | לא לשנות |
| `location_name` | Single line text | תצוגה |
| `address` | Single line text | למלא כתובת |
| `open` | Single line text ("10:00") | **עריכה — משפיע** |
| `close` | Single line text ("19:00") | **עריכה — משפיע** |
| `max_per_slot` | Number | **עריכה — משפיע** |
| `active` | Checkbox | **עריכה — משפיע** |

### טבלה `Exceptions` (ייבוא: `exceptions.csv`)
| שדה | סוג מומלץ | הערה |
|-----|-----------|------|
| `date` | **Date** (פורמט ISO) | **מפתח** — בורר תאריך |
| `holiday` | Single line text | תצוגה |
| `type` | Single select | תצוגה |
| `status` | Single select (closed / open / special) | **עריכה — משפיע** |
| `open` | Single line text | **עריכה — משפיע** (רק ב-special) |
| `close` | Single line text | **עריכה — משפיע** (רק ב-special) |
| `recommended` | Single line text | המלצה בלבד |
| `note` | Single line text | תצוגה |

</details>

> יתרון על Sheets: `Single select`/`Checkbox`/`Date` מונעים טעויות פורמט,
> יש היסטוריית שינויים והרשאות מובנות.

## 2) הטמעה בדשבורד — כבר מחווט ב-`index.html`

מנגנון ההטמעה כבר קיים בקוד הדשבורד: בזמן הפענוח מוזרק כפתור צף
**📍 ניהול מיקומים** (פינה שמאלית-תחתונה) שפותח חלון עם טבלת Airtable.
ההזרקה מוגנת ב-try/catch ו**אינרטית כברירת מחדל** — כל עוד הקבוע ריק אין
שום שינוי בדשבורד.

**כדי להפעיל (שורה אחת, בלי הצפנה מחדש):**
1. ב-Airtable: Grid view → **Share view → Embed this view** → העתק את כתובת
   ה-embed (מהצורה `https://airtable.com/embed/app…/shr…`).
2. ב-`index.html` מצא את השורה:
   ```js
   const AIRTABLE_EMBED_URL="";
   ```
   והדבק את הכתובת בין הגרשיים. זהו — commit ל-branch, והכפתור יופיע.

הקבוע נמצא בקוד ה**חיצוני** (הלא-מוצפן), שרץ בזמן ריצה על התוכן המפוענח —
לכן **אין צורך בסיסמה או בהצפנה מחדש**.

> **חשוב (אבטחה):** אין הרשאות כתיבה בקוד — ה-iframe רק מפנה ל-Airtable,
> ו-Airtable מנהל את ההרשאות. אם ה-view משותף לעריכה, כל מי שנכנס לדשבורד יכול
> לערוך; להגבלה, שתפו view לקריאה-בלבד או השתמשו ב-view עם הרשאות.

## 3) חיבור ה-AI ל-Airtable ב-Make

**Blueprint מוכן ומאומת:** `make/check_availability_airtable.blueprint.json` —
גרסת-Airtable מלאה של `check_availability` (כבר עם ה-Base/Table IDs והנוסחאות).

מה לעשות:
1. **צור חיבור Airtable ב-Make** — Connections → Add → Airtable → OAuth חד-פעמי
   (זה השלב היחיד שחייב להיעשות ידנית ב-Make; אי אפשר דרך API).
2. **ייבא** את ה-Blueprint (Create scenario → Import Blueprint) → נוצר עותק בדיקה.
3. בשני מודולי ה-Airtable (2 ו-3) בחר את החיבור שיצרת; במודול Fireberry (8) בחר
   `דוידסון` (powerlink). ה-Base/Table כבר ממולאים.
4. Run once + בקשת בדיקה (ראה `README_meeting_location_sheets.md`) → ודא סלוטים.
5. כשתקין — הפנה את סוכן ה-AI (Pingmee) ל-webhook החדש.

> `book_meeting` ו-`find_meeting` **לא** נגעו ב-Calendly ולא צריכים שינוי. אם תרצה
> ש-`book_meeting` יגזור את `location_code` מ-Airtable (במקום המיפוי הקשיח
> rishon→11/bnei→1) — זה שדרוג אופציונלי שאפשר להוסיף, שהופך גם הוספת מיקום עתידי
> לטבלה-בלבד.

<details><summary>המיפוי שבתוך ה-Blueprint (לעיון)</summary>

מחליפים את שני מודולי ה-Search של Google Sheets ב-**Airtable → Search Records**
(צריך ליצור חיבור Airtable ב-Make — OAuth חד-פעמי):

- **מודול 2 (לוח שבועי):** Base = `appVRL6NLQCYLTpxZ`, Table = `Weekly Schedule`
  (`tblgPrrTAghUEjg94`), `filterByFormula`:
  ```
  LOWER({weekday}) = "{{lower(formatDate(parseDate(1.start_date; "YYYY-MM-DD"); "dddd"))}}"
  ```
- **מודול 3 (חריגים):** Base = `appVRL6NLQCYLTpxZ`, Table = `Exceptions`
  (`tblz5sK3fOV2acPJE`), `filterByFormula`:
  ```
  DATETIME_FORMAT({date}; "YYYY-MM-DD") = "{{1.start_date}}"
  ```

שאר הזרימה (Repeater לשעות, ספירת פגישות ב-Fireberry, סינון, תשובה) נשארת
זהה ל-Blueprint הקיים. הפניות לשדות הופכות ל-`{{2.open}}`, `{{2.location_code}}`,
`{{2.max_per_slot}}`, `{{2.active}}`, `{{get(4.array;1).status}}` — אותם שמות שדות.

> `filterByFormula` של Airtable יציב יותר מסינון Sheets (אין בעיות פורמט/עמודה),
> ולכן זו גם שדרוג אמינות ולא רק UX.

</details>

## מה נשאר
1. ✅ ה-Base + הטבלאות + הנתונים — בוצע אוטומטית.
2. ✅ מנגנון ההטמעה בדשבורד — מחווט ב-`index.html` (אינרטי עד שמזינים URL).
3. ⬜ **כתובת ה-embed** של ה-Grid view (Share view → Embed) — הדבר היחיד שאני עוד צריך
   ממך, כי Airtable לא חושף יצירת קישור-שיתוף דרך API. שלח לי אותו ואפעיל את הכפתור.
4. ⬜ **Make:** ליצור חיבור Airtable ב-Make ולהחליף את שני מודולי ה-Sheets לפי המיפוי למעלה.
