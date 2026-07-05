# ארכיטקטורה A — Airtable כמקור אמת, מוטמע בדשבורד

מקור אמת אחד (Airtable) שגם ה-Make קורא ממנו וגם אתה עורך דרכו — מתוך הדשבורד
עצמו (iframe). אין backend לבנות, אין הרשאות כתיבה בקוד הסטטי.

```
        עריכה (אתה)                     קריאה (אוטומציה)
   Dashboard  ──iframe──►  Airtable  ◄──native module──  Make (check_availability)
```

## 1) יצירת ה-Base ב-Airtable

צור Base חדש (למשל "Davidson · מיקומים ופגישות") עם **שתי טבלאות**. ייבא את
ה-CSV לכל טבלה (Add/Import → CSV), ואז הגדר את סוגי השדות:

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

> יתרון על Sheets: `Single select`/`Checkbox`/`Date` מונעים טעויות פורמט,
> יש היסטוריית שינויים והרשאות מובנות.

## 2) הטמעה בדשבורד (iframe)

ב-Airtable: פותחים את ה-Grid view → **Share view → Embed this view** → מעתיקים
את כתובת ה-embed (מהצורה `https://airtable.com/embed/app…/shr…`).

מוסיפים לדשבורד טאב/סקשן "ניהול מיקומים" עם:

```html
<section id="locations-admin">
  <h2>ניהול מיקומים ותאריכים</h2>
  <iframe src="https://airtable.com/embed/appXXXXXXXX/shrYYYYYYYY"
          width="100%" height="640"
          style="border:1px solid #d6deea;border-radius:10px" frameborder="0"></iframe>
</section>
```

> **חשוב (אבטחה):** אל תטמיע הרשאות כתיבה בקוד הדשבורד. ה-iframe מפנה ל-Airtable,
> ו-Airtable מנהל את ההרשאות. אם ה-view משותף לעריכה — כל מי שנכנס לדשבורד יכול
> לערוך; אם רוצים הגבלה, שתפו view לקריאה-בלבד ותערכו ישירות ב-Airtable, או
> השתמשו ב-view עם הרשאות.

## 3) התאמת ה-Make (במקום מודולי Google Sheets)

מחליפים את שני מודולי ה-Search של Google Sheets ב-**Airtable → Search Records**:

- **מודול 2 (לוח שבועי):** Base = ה-Base, Table = `Weekly Schedule`,
  `filterByFormula`:
  ```
  LOWER({weekday}) = "{{lower(formatDate(parseDate(1.start_date; "YYYY-MM-DD"); "dddd"))}}"
  ```
- **מודול 3 (חריגים):** Table = `Exceptions`,
  `filterByFormula`:
  ```
  DATETIME_FORMAT({date}; "YYYY-MM-DD") = "{{1.start_date}}"
  ```

שאר הזרימה (Repeater לשעות, ספירת פגישות ב-Fireberry, סינון, תשובה) נשארת
זהה ל-Blueprint הקיים. הפניות לשדות הופכות ל-`{{2.open}}`, `{{2.location_code}}`,
`{{2.max_per_slot}}`, `{{2.active}}`, `{{get(4.array;1).status}}` — אותם שמות שדות.

> `filterByFormula` של Airtable יציב יותר מסינון Sheets (אין בעיות פורמט/עמודה),
> ולכן זו גם שדרוג אמינות ולא רק UX.

## מה צריך ממך כדי שאסיים
1. ה-Base מוקם ושתי הטבלאות מיובאות → שלח לי **Base ID** (`app…`) ושמות הטבלאות.
2. כתובת ה-**embed** של ה-Grid view.
3. איך נערכת ההטמעה בדשבורד — ראה השאלה בצ'אט (הדשבורד מוצפן, צריך את המקור).
