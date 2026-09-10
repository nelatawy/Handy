import enum


class WorkType(str, enum.Enum):
    PLUMBER = "plumber"
    ELECTRICIAN = "electrician"
    CARPENTER = "carpenter"
    IT = "it"
    AC_TECHNICIAN = "ac_technician"
    PAINTER = "painter"
    ALUMETAL = "alumetal"
    APPLIANCE_REPAIR = "appliance_repair"
    SATELLITE = "satellite"
    TILER = "tiler"
    WELDER = "welder"
    CLEANER = "cleaner"
    PEST_CONTROL = "pest_control"
    CAR_MECHANIC = "car_mechanic"


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
