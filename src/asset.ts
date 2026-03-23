import { createFlexAdmin } from "@bit-labs.cn/owl-ui/bootstrap";
import adminSubsystem from "@bit-labs.cn/owl-admin-ui";
import assetManageSubsystem from "@bit-labs.cn/asset-manage-ui";
import workorderSubsystem from "@bit-labs.cn/owl-workorder-ui";

/** 挂载平台管理、资产与工单子系统，用于资产管理场景独立启动 */
createFlexAdmin({
  subsystems: [adminSubsystem, assetManageSubsystem, workorderSubsystem]
}).then(app => app.mount("#app"));
