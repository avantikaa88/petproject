
export default function ConfirmDialog({
  open,
  title = "Please confirm",
  message = "Are you sure you want to do this?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div
        className="admin-modal admin-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="admin-confirm-title">{title}</h3>
        <p className="admin-confirm-message">{message}</p>

        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={onCancel}
            autoFocus
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`admin-btn ${danger ? "admin-btn-danger" : "admin-btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}