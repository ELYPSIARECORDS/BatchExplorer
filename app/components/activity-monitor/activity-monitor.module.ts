import { NgModule } from "@angular/core";

import { MaterialModule } from "@batch-flask/core";
import { commonModules } from "app/common";
import { ActivityMonitorItemComponent } from "./activity-monitor-item";
import { ActivityMonitorItemActionComponent } from "./activity-monitor-item/activity-monitor-item-action";
import { ActivityMonitorTreeViewComponent } from "./activity-monitor-tree-view";
import { ActivityMonitorComponent } from "./activity-monitor.component";

const components = [
    ActivityMonitorComponent,
    ActivityMonitorTreeViewComponent,
    ActivityMonitorItemComponent,
    ActivityMonitorItemActionComponent,
];

const modules = [
    MaterialModule,
];

@NgModule({
    declarations: components,
    exports: components,
    imports: [
        ...commonModules,
        ...modules,
    ],
})
export class ActivityMonitorModule {
}