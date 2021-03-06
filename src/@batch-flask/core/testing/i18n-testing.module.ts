import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { I18nModule, TranslationsLoaderService } from "../i18n";

const publicComponents = [];
const privateComponents = [];

export class TestTranslatationsLoaderService extends TranslationsLoaderService {
    public translations = new Map<string, string>();
}

@NgModule({
    imports: [BrowserModule, I18nModule],
    declarations: [...publicComponents, ...privateComponents],
    exports: publicComponents,
    entryComponents: [],
    providers: [
        { provide: TranslationsLoaderService, useClass: TestTranslatationsLoaderService },
    ],
})
export class I18nTestingModule {

    public static withTranslations(translations: StringMap<string>) {
        const service = new TestTranslatationsLoaderService();

        for (const [key, translation] of Object.entries(translations)) {
            service.translations.set(key, translation);
        }
        return {
            ngModule: I18nTestingModule,
            providers: [
                { provide: TranslationsLoaderService, useValue: service },
            ],
        };
    }
}
