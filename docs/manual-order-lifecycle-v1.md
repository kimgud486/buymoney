# Manual Order Lifecycle v1

AI SIGNALS manual BUY/SELL controls use five user-visible stages:

1. Signal confirmed
2. User confirmation
3. Broker acknowledgement
4. Partial fill
5. Filled

Safety rules:
- Signal is not an order.
- User confirmation is required before manual submission.
- Broker acknowledgement is not a fill.
- PARTIAL requires broker order id, filled quantity, and filled price evidence.
- FILLED requires broker order id, filled quantity, filled price, and broker filled status evidence.
- Missing evidence fails closed to ACKNOWLEDGED/BLOCKED instead of inventing a fill.
