import unicodedata

def normalize(s):
    if not s: return ""
    s = str(s).strip().lower()
    # Remove accents
    s = "".join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return s

with open('api/index.py', 'r') as f:
    content = f.read()

import_logic = """    try:
        wb = openpyxl.load_workbook(f)
        ws = wb.active
        headers = [str(c.value or "").strip().lower() for c in ws[1]]

        label_map = {v.lower(): k for k, v in labels.items()}
        label_map.update(
            {
                "date": "date",
                "catégorie": "category",
                "libellé": "label",
                "observation": "observation",
                "quantité": "quantity",
                "entrée": "income",
                "dépense": "expense",
                "solde cumulé": "balance",
            }
        )
        col_map = {}
        for i, h in enumerate(headers):
            if h in label_map:
                col_map[label_map[h]] = i

        added = 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not any(row):
                continue
            inc = float(row[col_map["income"]] or 0) if "income" in col_map else 0
            exp = float(row[col_map["expense"]] or 0) if "expense" in col_map else 0
            if inc == 0 and exp == 0:
                continue
            tx_type = "income" if inc > 0 else "expense"
            amount = inc if tx_type == "income" else exp
            raw_date = row[col_map["date"]] if "date" in col_map else None
            if isinstance(raw_date, datetime):
                tx_date = raw_date.date()
            elif isinstance(raw_date, date):
                tx_date = raw_date
            elif raw_date:
                try:
                    from dateutil import parser as dp

                    tx_date = dp.parse(str(raw_date)).date()
                except:
                    tx_date = date(
                        request.args.get("year", date.today().year, type=int),
                        request.args.get("month", date.today().month, type=int),
                        1,
                    )
            else:
                tx_date = date(
                    request.args.get("year", date.today().year, type=int),
                    request.args.get("month", date.today().month, type=int),
                    1,
                )
            t = Transaction(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                type=tx_type,
                amount=amount,
                quantity=int(row[col_map["quantity"]] or 1)
                if "quantity" in col_map
                else 1,
                label=str(row[col_map["label"]] or "") if "label" in col_map else "",
                category=str(row[col_map["category"]] or "Import")
                if "category" in col_map
                else "Import",
                observation=str(row[col_map["observation"]] or "")
                if "observation" in col_map
                else "",
                date=tx_date,
            )
            db.session.add(t)
            added += 1
        db.session.commit()"""

new_import_logic = """    try:
        import unicodedata
        def normalize_header(s):
            if not s: return ""
            s = str(s).strip().lower()
            return "".join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

        wb = openpyxl.load_workbook(f, data_only=True)
        added = 0
        custom_fields = settings.custom_fields

        for ws in wb.worksheets:
            headers = [normalize_header(c.value) for c in ws[1]]
            if not any(headers): continue

            # Build label map from settings + defaults
            label_map = {normalize_header(v): k for k, v in labels.items()}
            label_map.update({
                "date": "date",
                "categorie": "category",
                "libelle": "label",
                "observation": "observation",
                "quantite": "quantity",
                "entree": "income",
                "depense": "expense",
                "solde cumule": "balance",
            })
            # Add custom fields to label map
            for cf in custom_fields:
                label_map[normalize_header(cf["name"])] = cf["id"]

            col_map = {}
            for i, h in enumerate(headers):
                if h in label_map:
                    col_map[label_map[h]] = i

            for row in ws.iter_rows(min_row=2, values_only=True):
                if not any(row): continue

                # Skip TOTAL rows
                first_val = normalize_header(row[0]) if row and row[0] else ""
                if first_val == "total": continue

                inc = 0
                if "income" in col_map:
                    try: inc = float(row[col_map["income"]] or 0)
                    except: inc = 0

                exp = 0
                if "expense" in col_map:
                    try: exp = float(row[col_map["expense"]] or 0)
                    except: exp = 0

                if inc == 0 and exp == 0: continue

                tx_type = "income" if inc > 0 else "expense"
                amount = inc if tx_type == "income" else exp

                raw_date = row[col_map["date"]] if "date" in col_map else None
                if isinstance(raw_date, datetime):
                    tx_date = raw_date.date()
                elif isinstance(raw_date, date):
                    tx_date = raw_date
                elif raw_date:
                    try:
                        from dateutil import parser as dp
                        tx_date = dp.parse(str(raw_date)).date()
                    except:
                        tx_date = date(request.args.get("year", date.today().year, type=int),
                                     request.args.get("month", date.today().month, type=int), 1)
                else:
                    tx_date = date(request.args.get("year", date.today().year, type=int),
                                 request.args.get("month", date.today().month, type=int), 1)

                # Extract custom data
                row_custom_data = {}
                for cf in custom_fields:
                    if cf["id"] in col_map:
                        row_custom_data[cf["id"]] = row[col_map[cf["id"]]]

                t = Transaction(
                    id=str(uuid.uuid4()),
                    user_id=current_user.id,
                    type=tx_type,
                    amount=amount,
                    quantity=int(row[col_map["quantity"]] or 1) if "quantity" in col_map else 1,
                    label=str(row[col_map["label"]] or "") if "label" in col_map else "",
                    category=str(row[col_map["category"]] or "Import") if "category" in col_map else "Import",
                    observation=str(row[col_map["observation"]] or "") if "observation" in col_map else "",
                    date=tx_date,
                    custom_data=json.dumps(row_custom_data)
                )
                db.session.add(t)
                added += 1
        db.session.commit()"""

if import_logic in content:
    content = content.replace(import_logic, new_import_logic)
    with open('api/index.py', 'w') as f:
        f.write(content)
    print("Patch applied successfully")
else:
    print("Could not find import logic")
