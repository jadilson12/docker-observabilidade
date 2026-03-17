# ---------------------------------------------------------------------------
# Scripted Fields — campos calculados em index patterns
# ---------------------------------------------------------------------------

# ip-traces: durationInMillis = endTime - startTime (em milissegundos)
# O schema SS4O armazena startTime/endTime como datas; não há campo nativo de duração.
add_scripted_field "ip-traces" "durationInMillis" "number" \
  "doc['endTime'].value.millis - doc['startTime'].value.millis"
