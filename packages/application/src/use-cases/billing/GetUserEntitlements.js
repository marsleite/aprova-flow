import { DEFAULT_ENTITLEMENT_POLICY, resolveUserEntitlements, } from '@aprovamind/domain';
import { toUserEntitlementsSnapshot } from '@aprovamind/application/mappers/toUserEntitlementsSnapshot';
export class GetUserEntitlements {
    dataSource;
    policy;
    constructor(dataSource, policy = DEFAULT_ENTITLEMENT_POLICY) {
        this.dataSource = dataSource;
        this.policy = policy;
    }
    async execute(input) {
        const loaded = await this.dataSource.getUserSubscriptionState({
            userId: input.userId,
        });
        if (!loaded.found) {
            return loaded;
        }
        const entitlements = resolveUserEntitlements({
            plan: loaded.subscription.plan,
            status: loaded.subscription.status,
            usage: loaded.subscription.usage,
        }, this.policy);
        return {
            found: true,
            entitlements: toUserEntitlementsSnapshot(entitlements),
        };
    }
}
