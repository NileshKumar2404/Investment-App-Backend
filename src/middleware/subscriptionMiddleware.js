import { ApiError } from "../utils/ApiError.js";

/**
 * Subscription authorization middleware.
 * Checks whether the authenticated user has an active Pro or Enterprise tier subscription.
 *
 * @param {Array<string>|string} allowedPlans - e.g. ['founder_pro', 'all_access_pro']
 */
export const requireSubscription = (allowedPlans = ['founder_pro', 'investor_pro', 'all_access_pro']) => {
  const plans = Array.isArray(allowedPlans) ? allowedPlans : [allowedPlans];

  return (req, res, next) => {
    // Admins and Super Admins bypass subscription checks
    if (req.user && ['admin', 'super_admin'].includes(req.user.role)) {
      return next();
    }

    const sub = req.user?.subscription || { plan: 'free', status: 'active' };

    // Check if subscription has expired
    if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
      throw new ApiError(
        403,
        "Your subscription has expired. Please renew your plan to continue using this feature."
      );
    }

    // Check plan membership (all_access_pro unlocks everything)
    const isEntitled = 
      sub.plan === 'all_access_pro' ||
      plans.includes(sub.plan);

    if (!isEntitled || sub.status !== 'active') {
      return res.status(403).json({
        statusCode: 403,
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        requiredPlans: plans,
        currentPlan: sub.plan,
        message: `This premium feature requires an active ${plans.join(' or ').replace(/_/g, ' ').toUpperCase()} subscription.`
      });
    }

    next();
  };
};
