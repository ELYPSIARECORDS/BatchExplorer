import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { ButtonsModule } from "@batch-flask/ui/buttons";
import { CardModule } from "@batch-flask/ui/card";
import { EditorModule } from "@batch-flask/ui/editor";
import { I18nUIModule } from "@batch-flask/ui/i18n";
import { LoadingModule } from "@batch-flask/ui/loading";
import { FileDialogViewerComponent } from "./file-dialog-viewer";
import { FileTooLargeComponent } from "./file-too-large";
import { FileTypeAssociationService } from "./file-type-association";
import { FileViewerContainerComponent, FileViewerHeaderComponent } from "./file-viewer-container";
import { ImageFileViewerComponent } from "./image-file-viewer";
import { LogFileViewerComponent } from "./log-file-viewer";
import { TextFileViewerComponent } from "./text-file-viewer";

const publicComponents = [
    FileViewerHeaderComponent,
    FileViewerContainerComponent,
    FileTooLargeComponent,
    LogFileViewerComponent,
    ImageFileViewerComponent,
    TextFileViewerComponent,
    FileDialogViewerComponent,
];

@NgModule({
    declarations: [...publicComponents],
    exports: [...publicComponents],
    imports: [
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonsModule,
        LoadingModule,
        EditorModule,
        I18nUIModule,
    ],
    entryComponents: [
        FileDialogViewerComponent,
        LogFileViewerComponent,
        ImageFileViewerComponent,
        TextFileViewerComponent,
    ],
    providers: [
        FileTypeAssociationService,
    ],
})
export class FileViewerModule {

}
