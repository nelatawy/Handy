"""Paymob provider adapter — sandbox/live Intention API, 3-Step Checkout & Disbursements.

Honors PAYMOB_MODE ('mock' | 'sandbox' | 'live'). In 'mock' mode no network
call is made; fake URLs/references are returned. In 'sandbox' and 'live' the
real Paymob APIs are called and HMAC verification is performed.
"""

import hashlib
import hmac as hmac_module
import logging
import uuid
from dataclasses import dataclass
from typing import Optional

import requests
from flask import current_app

logger = logging.getLogger(__name__)

PAYMOB_API_BASE = "https://accept.paymob.com"
PAYMOB_PAYOUTS_DEFAULT_BASE = "https://payouts.paymobsolutions.com"


@dataclass
class CheckoutResult:
    checkout_url: str
    order_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mode() -> str:
    return current_app.config.get("PAYMOB_MODE", "mock")


def _cfg(key: str) -> str:
    """Read a required config value, raising if missing."""
    val = current_app.config.get(key)
    if not val:
        raise RuntimeError(f"Missing required config: {key}")
    return val


def _detect_wallet_issuer(phone: str) -> str:
    """Detect Egyptian mobile wallet issuer from phone number.
    Vodafone: 010
    Orange: 012
    Etisalat: 011
    WE: 015
    """
    clean = phone.replace("+20", "0").replace("+", "").strip()
    if clean.startswith("20"):
        clean = "0" + clean[2:]
    if clean.startswith("010"):
        return "vodafone"
    if clean.startswith("011"):
        return "etisalat"
    if clean.startswith("012"):
        return "orange"
    if clean.startswith("015"):
        return "we"
    return "bank_wallet"


def _format_msisdn(phone: str) -> str:
    """Format phone number to Egyptian MSISDN (e.g. 01012345678 or 201012345678)."""
    clean = phone.replace("+", "").strip()
    if clean.startswith("01") and len(clean) == 11:
        return "2" + clean
    if not clean.startswith("20") and clean.startswith("1"):
        return "20" + clean
    return clean


def _clean_wallet_phone(phone: str) -> str:
    """Format phone number to Egyptian local mobile number (01xxxxxxxxx)."""
    clean = phone.replace("+20", "0").replace("+", "").strip()
    if clean.startswith("20") and len(clean) == 12:
        clean = "0" + clean[2:]
    if not clean.startswith("0") and len(clean) == 10:
        clean = "0" + clean
    # In sandbox mode, ensure a registered test wallet is used if input is not 11-digit mobile
    if _mode() == "sandbox" and not (clean.startswith("01") and len(clean) == 11):
        return "01010101010"
    return clean


# ---------------------------------------------------------------------------
# create_checkout — Supports Vodafone Cash / Mobile Wallets & Hosted Checkout
# ---------------------------------------------------------------------------

def create_checkout(
    job_id: str,
    amount: float,
    customer_phone: Optional[str] = None,
    customer_name: Optional[str] = None,
    customer_email: Optional[str] = None,
    wallet_phone: Optional[str] = None,
) -> CheckoutResult:
    """Create a Paymob payment checkout URL for the job.

    By default initiates a Vodafone Cash / Mobile Wallet payment.
    """
    if _mode() == "mock":
        logger.info("[paymob:mock] create_checkout job_id=%s amount=%s", job_id, amount)
        fake_order_id = f"mock-order-{job_id}"
        return CheckoutResult(
            checkout_url=f"https://mock-paymob.local/checkout/{fake_order_id}",
            order_id=fake_order_id,
        )

    api_key = _cfg("PAYMOB_API_KEY")
    integration_id = current_app.config.get("PAYMOB_WALLET_INTEGRATION_ID") or _cfg("PAYMOB_INTEGRATION_ID")
    backend_url = _cfg("BACKEND_URL").rstrip("/")
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:4200").rstrip("/")

    secret_key = current_app.config.get("PAYMOB_SECRET_KEY")
    public_key = current_app.config.get("PAYMOB_PUBLIC_KEY")
    iframe_id = current_app.config.get("PAYMOB_IFRAME_ID", "989687")

    amount_cents = int(round(amount * 100))
    first_name = (customer_name or "Handy").split()[0]
    last_name = (customer_name or "Customer").split()[-1] if " " in (customer_name or "") else "Customer"
    phone_number = customer_phone or "+201000000000"
    email = customer_email or "customer@handy.app"

    billing_data = {
        "apartment": "NA",
        "email": email,
        "floor": "NA",
        "first_name": first_name,
        "street": "NA",
        "building": "NA",
        "phone_number": phone_number,
        "shipping_method": "NA",
        "postal_code": "NA",
        "city": "Cairo",
        "country": "EG",
        "last_name": last_name,
        "state": "Cairo",
    }

    # Step 1: Authentication token
    auth_resp = requests.post(
        f"{PAYMOB_API_BASE}/api/auth/tokens",
        json={"api_key": api_key},
        timeout=30,
    )
    if auth_resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Paymob Auth failed {auth_resp.status_code}: {auth_resp.text[:200]}"
        )
    auth_token = auth_resp.json().get("token")

    # Step 2: Order Registration
    unique_order_id = f"{job_id}_{uuid.uuid4().hex[:8]}"
    order_payload = {
        "auth_token": auth_token,
        "delivery_needed": "false",
        "amount_cents": str(amount_cents),
        "currency": "EGP",
        "merchant_order_id": unique_order_id,
        "items": [
            {
                "name": f"Handy Job #{job_id[:8]}",
                "amount_cents": str(amount_cents),
                "description": "Handy service payment",
                "quantity": "1",
            }
        ],
    }
    order_resp = requests.post(
        f"{PAYMOB_API_BASE}/api/ecommerce/orders",
        json=order_payload,
        timeout=30,
    )
    if order_resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Paymob Order creation failed {order_resp.status_code}: {order_resp.text[:200]}"
        )
    order_data = order_resp.json()
    order_id = str(order_data.get("id"))

    # Step 3: Payment Key Request (for Mobile Wallet)
    pk_payload = {
        "auth_token": auth_token,
        "amount_cents": str(amount_cents),
        "expiration": 3600,
        "order_id": order_id,
        "billing_data": billing_data,
        "currency": "EGP",
        "integration_id": int(integration_id),
        "lock_order_when_paid": "false",
    }
    pk_resp = requests.post(
        f"{PAYMOB_API_BASE}/api/acceptance/payment_keys",
        json=pk_payload,
        timeout=30,
    )
    if pk_resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Paymob Payment Key generation failed {pk_resp.status_code}: {pk_resp.text[:200]}"
        )
    payment_token = pk_resp.json().get("token")

    # Step 4: Pay via Vodafone Cash / Mobile Wallet
    target_wallet_phone = _clean_wallet_phone(wallet_phone or customer_phone or "01010101010")
    wallet_pay_payload = {
        "source": {
            "identifier": target_wallet_phone,
            "subtype": "WALLET",
        },
        "payment_token": payment_token,
    }

    logger.info(
        "[paymob:%s] Initiating Vodafone Cash wallet payment for %s amount_cents=%s",
        _mode(), target_wallet_phone, amount_cents,
    )

    pay_resp = requests.post(
        f"{PAYMOB_API_BASE}/api/acceptance/payments/pay",
        json=wallet_pay_payload,
        timeout=30,
    )

    if pay_resp.status_code in (200, 201):
        pay_data = pay_resp.json()
        redirect_url = (
            pay_data.get("redirect_url")
            or pay_data.get("iframe_redirection_url")
            or pay_data.get("data", {}).get("redirect_url")
        )
        if redirect_url:
            logger.info(
                "[paymob:%s] Vodafone Cash payment ready — order_id=%s redirect_url=%s",
                _mode(), order_id, redirect_url,
            )
            return CheckoutResult(checkout_url=redirect_url, order_id=order_id)

    # Fallback to hosted checkout iframe only if wallet redirect is not returned
    checkout_url = (
        f"{PAYMOB_API_BASE}/api/acceptance/iframes/{iframe_id}?payment_token={payment_token}"
    )
    return CheckoutResult(checkout_url=checkout_url, order_id=order_id)


# ---------------------------------------------------------------------------
# verify_webhook_signature — HMAC-SHA512
# ---------------------------------------------------------------------------

_HMAC_FIELDS = [
    "amount_cents",
    "created_at",
    "currency",
    "error_occured",
    "has_parent_transaction",
    "id",
    "integration_id",
    "is_3d_secure",
    "is_auth",
    "is_capture",
    "is_refunded",
    "is_standalone_payment",
    "is_voided",
    "order.id",
    "owner",
    "pending",
    "source_data.pan",
    "source_data.sub_type",
    "source_data.type",
    "success",
]


def _extract_field(obj: dict, dotted_key: str):
    """Resolve a dotted key like 'order.id' from a nested dict."""
    parts = dotted_key.split(".")
    val = obj
    for part in parts:
        if isinstance(val, dict):
            val = val.get(part, "")
        else:
            return ""

    if val is None:
        return ""
    if isinstance(val, bool):
        return "true" if val else "false"
    return str(val)


def verify_webhook_signature(payload: dict, hmac_signature: str) -> bool:
    """Verify the Paymob HMAC-SHA512 signature on a webhook callback."""
    if _mode() == "mock":
        logger.info("[paymob:mock] verify_webhook_signature — auto-pass")
        return True

    secret = _cfg("PAYMOB_HMAC_SECRET")
    obj = payload.get("obj", payload)

    # Build the concatenated string from the standard fields
    values = []
    for field in _HMAC_FIELDS:
        val = _extract_field(obj, field)
        # Fallback for order.id if order is integer
        if field == "order.id" and val == "":
            val = str(obj.get("order", ""))
        values.append(str(val))

    concatenated = "".join(values)

    calculated = hmac_module.new(
        key=secret.encode("utf-8"),
        msg=concatenated.encode("utf-8"),
        digestmod=hashlib.sha512,
    ).hexdigest()

    is_valid = hmac_module.compare_digest(calculated, hmac_signature)

    if not is_valid:
        logger.warning(
            "[paymob] HMAC mismatch — expected=%s calculated=%s (first 32 chars)",
            hmac_signature[:32], calculated[:32],
        )

    return is_valid


# ---------------------------------------------------------------------------
# create_payout — Paymob Disbursements API
# ---------------------------------------------------------------------------

def create_payout(
    worker_id: str,
    amount: float,
    worker_phone: Optional[str] = None,
    worker_name: Optional[str] = None,
) -> str:
    """Request a real Paymob payout/disbursement to a worker's mobile wallet.

    Parameters
    ----------
    worker_id : str
        The worker user identifier.
    amount : float
        Disbursement amount in EGP.
    worker_phone : Optional[str]
        Recipient mobile number. If omitted, resolved from the worker User record.
    worker_name : Optional[str]
        Recipient name for logging and reconciliation.
    """
    if _mode() == "mock":
        logger.info("[paymob:mock] create_payout worker_id=%s amount=%s", worker_id, amount)
        return f"mock-payout-{worker_id}"

    payout_base = current_app.config.get("PAYMOB_PAYOUT_BASE_URL", PAYMOB_PAYOUTS_DEFAULT_BASE).rstrip("/")
    client_id = current_app.config.get("PAYMOB_PAYOUT_CLIENT_ID")
    client_secret = current_app.config.get("PAYMOB_PAYOUT_CLIENT_SECRET")
    payout_token = current_app.config.get("PAYMOB_PAYOUT_TOKEN")

    # Resolve phone number if not supplied
    phone = worker_phone
    if not phone:
        from app.models.user import User
        worker = User.query.get(worker_id)
        if worker and worker.phone_number:
            phone = worker.phone_number
        else:
            phone = "+201000000000"

    issuer = _detect_wallet_issuer(phone)
    msisdn = _format_msisdn(phone)
    client_ref = f"payout-{worker_id[:8]}-{uuid.uuid4().hex[:8]}"

    # Step 1: Obtain Authorization Token
    token = None
    if payout_token:
        token = payout_token
    elif client_id and client_secret:
        logger.info("[paymob:%s] Authenticating with Paymob Payouts OAuth", _mode())
        tok_resp = requests.post(
            f"{payout_base}/api/secure/o/token/",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "client_credentials",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        if tok_resp.status_code in (200, 201):
            token = tok_resp.json().get("access_token")
        else:
            logger.error(
                "[paymob] Payout OAuth failed %s: %s",
                tok_resp.status_code, tok_resp.text[:300],
            )
            raise RuntimeError(
                f"Paymob Payout token request failed {tok_resp.status_code}: {tok_resp.text[:200]}"
            )
    else:
        # Check if Accept API token works as fallback
        api_key = current_app.config.get("PAYMOB_API_KEY")
        if api_key:
            auth_resp = requests.post(
                f"{PAYMOB_API_BASE}/api/auth/tokens",
                json={"api_key": api_key},
                timeout=30,
            )
            if auth_resp.status_code in (200, 201):
                token = auth_resp.json().get("token")

    if not token:
        raise RuntimeError(
            "Paymob Payouts requires PAYMOB_PAYOUT_CLIENT_ID & PAYMOB_PAYOUT_CLIENT_SECRET "
            "(or PAYMOB_PAYOUT_TOKEN) from https://payouts.paymobsolutions.com. "
            "Please ensure disbursement permissions are active on your Paymob account."
        )

    # Step 2: Trigger Disbursement
    disburse_payload = {
        "amount": round(float(amount), 2),
        "currency": "EGP",
        "issuer": issuer,
        "msisdn": msisdn,
        "client_reference_id": client_ref,
        "customer_bears_fees": False,
    }

    logger.info(
        "[paymob:%s] Sending disbursement to %s issuer=%s amount=%.2f ref=%s",
        _mode(), msisdn, issuer, amount, client_ref,
    )

    resp = requests.post(
        f"{payout_base}/api/secure/disburse/",
        json=disburse_payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )

    if resp.status_code in (200, 201):
        data = resp.json()
        txn_ref = str(
            data.get("transaction_id")
            or data.get("id")
            or data.get("disbursement_id")
            or client_ref
        )
        logger.info(
            "[paymob:%s] Disbursement succeeded — ref=%s", _mode(), txn_ref
        )
        return txn_ref

    # Capture detailed error
    err_text = resp.text[:300]
    logger.error(
        "[paymob] Disbursement failed with status %s: %s", resp.status_code, err_text
    )
    raise RuntimeError(
        f"Paymob Disbursement failed ({resp.status_code}): {err_text}"
    )
