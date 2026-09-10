import enum


class WorkType(str, enum.Enum):
    PLUMBER = "plumber"
    ELECTRICIAN = "electrician"
    CARPENTER = "carpenter"
    IT = "it"


class RequestStatus(str, enum.Enum):
    OPEN = "open"
    OFFER_SELECTED = "offer_selected"
    CANCELLED = "cancelled"


class OfferStatus(str, enum.Enum):
    PENDING = "pending"
    CHOSEN = "chosen"
    REJECTED = "rejected"


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    STARTED = "started"
    FINISHED = "finished"
    CANCELED = "canceled"


class PaymentMethod(str, enum.Enum):
    ONLINE = "online"
    CASH = "cash"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"


class CanceledBy(str, enum.Enum):
    USER = "user"
    WORKER = "worker"
