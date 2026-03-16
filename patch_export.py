import re

with open('api/index.py', 'r') as f:
    content = f.read()

# 1. Add custom_fields retrieval
content = content.replace(
    '    settings = get_or_create_settings(current_user)\n    labels = settings.field_labels',
    '    settings = get_or_create_settings(current_user)\n    labels = settings.field_labels\n    custom_fields = settings.custom_fields'
)

# 2. Update headers
old_headers = """        headers = [
            labels.get("date", "Date"),
            labels.get("category", "Catégorie"),
            labels.get("label", "Libellé"),
            labels.get("observation", "Observation"),
            labels.get("quantity", "Quantité"),
            labels.get("income", "Entrée"),
            labels.get("expense", "Dépense"),
            "Solde cumulé",
        ]"""

new_headers = """        headers = [
            labels.get("date", "Date"),
            labels.get("category", "Catégorie"),
            labels.get("label", "Libellé"),
            labels.get("observation", "Observation"),
            labels.get("quantity", "Quantité"),
        ]
        for cf in custom_fields:
            headers.append(cf["name"])
        headers.extend([
            labels.get("income", "Entrée"),
            labels.get("expense", "Dépense"),
            "Solde cumulé",
        ])"""

content = content.replace(old_headers, new_headers)

# 3. Update row data
old_row_data = """            inc_val = t.amount if t.type == "income" else 0
            exp_val = t.amount if t.type == "expense" else 0

            inc_cell = ws.cell(row=row_idx, column=6, value=inc_val)
            exp_cell = ws.cell(row=row_idx, column=7, value=exp_val)
            bal_cell = ws.cell(row=row_idx, column=8, value=running)"""

new_row_data = """            curr_col = 6
            t_custom = json.loads(t.custom_data or "{}")
            for cf in custom_fields:
                ws.cell(row=row_idx, column=curr_col, value=t_custom.get(cf["id"], ""))
                curr_col += 1

            inc_val = t.amount if t.type == "income" else 0
            exp_val = t.amount if t.type == "expense" else 0

            inc_cell = ws.cell(row=row_idx, column=curr_col, value=inc_val)
            exp_cell = ws.cell(row=row_idx, column=curr_col + 1, value=exp_val)
            bal_cell = ws.cell(row=row_idx, column=curr_col + 2, value=running)"""

content = content.replace(old_row_data, new_row_data)

# 4. Update totals
old_totals = """        c_inc = ws.cell(row=total_row, column=6, value=total_inc)
        c_inc.font = Font(bold=True, color="059669")
        c_exp = ws.cell(row=total_row, column=7, value=total_exp)
        c_exp.font = Font(bold=True, color="DC2626")"""

new_totals = """        income_col = 6 + len(custom_fields)
        expense_col = income_col + 1
        c_inc = ws.cell(row=total_row, column=income_col, value=total_inc)
        c_inc.font = Font(bold=True, color="059669")
        c_exp = ws.cell(row=total_row, column=expense_col, value=total_exp)
        c_exp.font = Font(bold=True, color="DC2626")"""

content = content.replace(old_totals, new_totals)

with open('api/index.py', 'w') as f:
    f.write(content)
