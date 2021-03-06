import { NgModule } from "@angular/core";

import { commonModules } from "app/common";
import { ActivatePackageDialogComponent, ApplicationCreateDialogComponent, ApplicationEditDialogComponent,
} from "./action";
import { ApplicationListComponent, ApplicationPreviewComponent } from "./browse";
import { ApplicationConfigurationComponent, ApplicationDefaultComponent , ApplicationDetailsComponent,
    ApplicationPackageTableComponent, ApplicationPackagesComponent,
} from "./details";
import { ApplicationErrorDisplayComponent } from "./errors";
import { ApplicationHomeComponent } from "./home";

const components = [ActivatePackageDialogComponent, ApplicationCreateDialogComponent, ApplicationDefaultComponent,
    ApplicationDetailsComponent, ApplicationEditDialogComponent, ApplicationErrorDisplayComponent,
    ApplicationHomeComponent, ApplicationListComponent, ApplicationPackagesComponent, ApplicationPackageTableComponent,
    ApplicationPreviewComponent, ApplicationConfigurationComponent,
];

@NgModule({
    declarations: components,
    exports: components,
    imports: [...commonModules ],
    entryComponents: [
        ActivatePackageDialogComponent,
        ApplicationCreateDialogComponent,
        ApplicationEditDialogComponent,
    ],
})
export class ApplicationModule {
}
