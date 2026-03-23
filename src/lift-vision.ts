import { createFlexAdmin } from "@bit-labs.cn/owl-ui/bootstrap";
import adminSubsystem from "@bit-labs.cn/owl-admin-ui";
import liftvisionSubsystem from "@bit-labs.cn/lift-vision-ui";

createFlexAdmin({
  subsystems: [
    liftvisionSubsystem,
    adminSubsystem,
  ]
}).then(app => app.mount("#app"));
             