import sequelize from '../config/db';

// Import all models to register them with Sequelize
import './User';
import './Otp';
import './Setting';
import './Banner';
import './Business';
import './BusinessAssociate';
import './BusinessType';
import './Card';
import './CreatooRequest';
import './CreatorPointsTransaction';
import './ExclusiveOffer';
import './NewUserNotification';
import './NotificationLog';
import './Order';
import './Payment';
import './Plan';
import './Post';
import './PostInterest';
import './PostReport';
import './PromotionalNotification';
import './Referrer';
import './Review';
import './Subscription';
import './TemporaryOrder';
import './UserNotification';
import './Version';
import './Visit';
import './WalletTransaction';
import './WithdrawRequest';
import './invoice';

// Ensure all models are properly associated with this sequelize instance
const models = sequelize.models;

export default sequelize;

