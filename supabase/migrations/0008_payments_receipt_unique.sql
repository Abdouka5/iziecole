-- Two payments should never share the same printed receipt number.
create unique index payments_receipt_number_unique
  on public.payments (receipt_number)
  where receipt_number is not null;
