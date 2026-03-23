import { createFlexAdmin } from "@bit-labs.cn/owl-ui/bootstrap";
import adminSubsystem from "@bit-labs.cn/owl-admin-ui";
import cmsSubsystem from "@bit-labs.cn/owl-cms-ui";
import patrolSubsystem from "@bit-labs.cn/owl-portal-ui";

createFlexAdmin({
  subsystems: [
    cmsSubsystem,
    patrolSubsystem,
    adminSubsystem,
    cmsSubsystem
  ]
}).then(app => app.mount("#app"));
             