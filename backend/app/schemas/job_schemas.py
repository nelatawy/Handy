from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.models.enums import JobStatus, PaymentMethod


class JobStatusUpdateSchema(Schema):
    status = fields.String(
        required=True,
        validate=validate.OneOf([JobStatus.STARTED.value, JobStatus.FINISHED.value, JobStatus.CANCELED.value]),
    )
    payment_type = fields.String(
        data_key="paymentType", load_default=None, validate=validate.OneOf([m.value for m in PaymentMethod])
    )

    @validates_schema
    def require_payment_type_when_finishing(self, data, **kwargs):
        if data.get("status") == JobStatus.FINISHED.value and not data.get("payment_type"):
            raise ValidationError("paymentType is required when finishing a job", field_name="paymentType")
