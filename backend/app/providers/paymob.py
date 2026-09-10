"""Paymob provider adapter — sandbox hosted-checkout redirect flow.

Honors PAYMOB_MODE ('mock' | 'sandbox' | 'live'). In 'mock' mode no network
call is made; a fake checkout URL is returned.
"""

import logging
from dataclasses import dataclass

from flask import current_app

logger = logging.getLogger(__name__)


@dataclass
class CheckoutResult:
    checkout_url: str
    order_id: str


def _mode() -> str:
    return current_app.config.get("PAYMOB_MODE", "mock")


def create_checkout(job_id: str, amount: float) -> CheckoutResult:
    if _mode() == "mock":
        logger.info("[paymob:mock] create_checkout job_id=%s amount=%s", job_id, amount)
        fake_order_id = f"mock-order-{job_id}"
        return CheckoutResult(
            checkout_url=f"https://mock-paymob.local/checkout/{fake_order_id}",
            order_id=fake_order_id,
        )

    raise NotImplementedError("Live Paymob integration not implemented yet")


def verify_webhook_signature(payload: dict, hmac_signature: str) -> bool:
    if _mode() == "mock":
        logger.info("[paymob:mock] verify_webhook_signature")
        return True

    raise NotImplementedError("Live Paymob integration not implemented yet")


def create_payout(worker_id: str, amount: float) -> str:
    if _mode() == "mock":
        logger.info("[paymob:mock] create_payout worker_id=%s amount=%s", worker_id, amount)
        return f"mock-payout-{worker_id}"

    raise NotImplementedError("Live Paymob integration not implemented yet")
