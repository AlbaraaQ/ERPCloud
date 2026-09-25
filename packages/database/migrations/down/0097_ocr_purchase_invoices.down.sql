-- 0097 rollback — OCR purchase-invoice intake and review jobs

DELETE FROM permissions WHERE code = 'purchase.ocr.use';
DROP TABLE IF EXISTS ocr_jobs;
