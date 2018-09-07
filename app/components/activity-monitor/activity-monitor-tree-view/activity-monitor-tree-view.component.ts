import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component,
    EventEmitter, HostListener, Input, OnChanges, Output, QueryList, ViewChildren,
} from "@angular/core";
import { Activity } from "@batch-flask/ui";
import { ActivityMonitorItemComponent } from "../activity-monitor-item";

import { ChangeEvent } from "@batch-flask/ui/virtual-scroll";
import "./activity-monitor-tree-view.scss";

export interface TreeRow {
    activity: Activity;
    id: number;
    expanded: boolean;
    hasChildren: boolean;
    indent: number;
    index: number;
    parent: TreeRow;
}

@Component({
    selector: "bl-activity-monitor-tree-view",
    templateUrl: "activity-monitor-tree-view.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityMonitorTreeViewComponent implements OnChanges {
    @Input() public activities: Activity[];
    @Input() public name: string;
    @Input() public xButtonTitle: string;
    @Output() public focus = new EventEmitter<boolean>();
    @Output() public xButton = new EventEmitter<void>();

    public expanded = new Set<number>();
    public treeRows: TreeRow[] = [];
    public dropTargetPath: string = null;
    public isFocused = false;
    public focusedIndices: Set<number> = new Set([-1]);
    public lastFocusedIndex: number;
    public shiftKey: boolean;
    public ctrlKey: boolean;
    public hoveredIndex: number;
    public focusedAction: number = null;
    public viewPortRows: TreeRow[] = [];
    public viewPortStart: number = 0;

    @ViewChildren(ActivityMonitorItemComponent) private _itemComponents: QueryList<ActivityMonitorItemComponent>;

    constructor(private changeDetector: ChangeDetectorRef) { }

    public ngOnChanges(changes) {
        if (changes.activities) {
            this._buildTreeRows();
        }
    }

    public toggleRowExpand(treeRow: TreeRow) {
        if (treeRow.hasChildren) {
            this._toggleExpanded(treeRow);
        }
        this.focusRow(treeRow);
    }

    public focusRow(treeRow: TreeRow) {
        if (this.shiftKey) {
            const [start, end] = treeRow.index < this.lastFocusedIndex ?
                [treeRow.index, this.lastFocusedIndex] :
                [this.lastFocusedIndex, treeRow.index];
            const newIndices = this.treeRows.map(row => row.index).slice(start, end + 1);
            this.focusedIndices = new Set(newIndices);
        } else if (this.ctrlKey) {
            this.focusedIndices.add(treeRow.index);
        } else {
            this.focusedIndices = new Set([treeRow.index]);
        }
        this.lastFocusedIndex = treeRow.index;
        this.focusedAction = null;
        this.changeDetector.markForCheck();
    }

    public hoverRow(treeRow: TreeRow) {
        this.hoveredIndex = treeRow.index;
        this.changeDetector.markForCheck();
    }

    public clearHover() {
        this.hoveredIndex = -1;
    }

    public isExpanded(id: number) {
        return this.expanded.has(id);
    }

    @HostListener("keydown", ["$event"])
    public handleKeyboardNavigation(event: KeyboardEvent) {
        event.stopImmediatePropagation();
        if (!this.isFocused) { return; }
        const curTreeRow = this.treeRows[this.lastFocusedIndex];
        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight":
                this.shiftKey = true;
                return;
            case "ControlLeft":
            case "ControlRight":
                this.ctrlKey = true;
                return;
            case "ArrowDown": // Move focus down
                if (event.shiftKey) {
                    this.focusedIndices.add(this.lastFocusedIndex + 1);
                } else {
                    this.focusedIndices = new Set([this.lastFocusedIndex + 1]);
                }
                this.lastFocusedIndex++;
                this.focusedAction = null;
                event.preventDefault();
                break;
            case "ArrowUp":   // Move focus up
                if (event.shiftKey) {
                    this.focusedIndices.add(this.lastFocusedIndex - 1);
                } else {
                    this.focusedIndices = new Set([this.lastFocusedIndex - 1]);
                }
                this.lastFocusedIndex--;
                this.focusedAction = null;
                event.preventDefault();
                break;
            case "ArrowRight": // Expand current row if applicable
                this._onRightPress(curTreeRow);
                event.preventDefault();
                break;
            case "ArrowLeft": // Expand current row if applicable
                this._onLeftPress(curTreeRow);
                event.preventDefault();
                break;
            case "Space":
            case "Enter":
                if (this.focusedAction === null) {
                    this.toggleRowExpand(curTreeRow);
                } else {
                    this._execItemAction(curTreeRow);
                }
                event.preventDefault();
                return;
            case "Tab":
                if (event.shiftKey) {
                    this._tabBackward(curTreeRow);
                } else {
                    this._tabForward(curTreeRow);
                }
                event.preventDefault();
                break;
            default:
                break;
        }
        this.lastFocusedIndex = (this.lastFocusedIndex + this.treeRows.length) % this.treeRows.length;
        // iterate through and modulo all elements of the focused indices set
        const newIndices = Array.from(this.focusedIndices.values()).map(val => {
            return (val + this.treeRows.length) % this.treeRows.length;
        });
        this.focusedIndices = new Set(newIndices);
        this.changeDetector.markForCheck();
    }

    @HostListener("keyup", ["$event"])
    public handleKeyUp(event: KeyboardEvent) {
        if (!this.isFocused) { return; }
        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight":
                this.shiftKey = false;
                return;
            case "ControlLeft":
            case "ControlRight":
                this.ctrlKey = false;
                return;
            default:
        }
    }

    public shouldFocusItem(index) {
        return this.focusedIndices.has(index);
    }

    public setFocus(focus: boolean) {
        this.isFocused = focus;
        this.focus.emit(focus);
        if (!focus) {
            this.focusedIndices.clear();
            this.lastFocusedIndex = -1;
        }
        this.changeDetector.markForCheck();
    }

    public expand(treeRow: TreeRow) {
        if (!treeRow.hasChildren) { return; }
        this.expanded.add(treeRow.id);
        this._buildTreeRows();
    }

    public collapse(treeRow: TreeRow) {
        if (!treeRow.hasChildren) { return; }
        this.expanded.delete(treeRow.id);
        this._buildTreeRows();
    }

    public collapseAll() {
        this.expanded.clear();
        this._buildTreeRows();
    }

    public xButtonClicked() {
        this.xButton.emit();
    }

    public treeRowTrackBy(treeRow: TreeRow) {
        return treeRow.id;
    }

    public updateViewPortItems(items: TreeRow[]) {
        this.viewPortRows = items;
        this.changeDetector.markForCheck();
    }

    public onViewScroll(event: ChangeEvent) {
        this.viewPortStart = event.start;
    }

    /**
     * @param treeRow Tree row that should toggle the expansion
     * @returns boolean if the row is now expanded or not
     */
    private _toggleExpanded(treeRow: TreeRow): boolean {
        const isExpanded = this.isExpanded(treeRow.id);
        if (isExpanded) {
            this.expanded.delete(treeRow.id);
        } else {
            this.expanded.add(treeRow.id);
            // this.fileNavigator.loadPath(treeRow.path);
        }
        this._buildTreeRows();
        this.changeDetector.markForCheck();
        return !isExpanded;
    }

    private _buildTreeRows() {
        this.treeRows = this._getTreeRowsForActivities(this.activities);
        this.changeDetector.markForCheck();
    }

    private _getTreeRowsForActivities(activities: Activity[], indent = 0, parent = null): TreeRow[] {
        const tree = [];
        for (const activity of activities) {
            const expanded = this.isExpanded(activity.id);
            const row = {
                activity,
                id: activity.id,
                expanded,
                indent,
                parent,
            };
            if (activity.subactivities.length > 0) {
                row["hasChildren"] = true;
                tree.push(row);
                if (expanded) {
                    for (const childRow of this._getTreeRowsForActivities(activity.subactivities, indent + 1, row)) {
                        tree.push(childRow);
                    }
                }
            } else {
                row["hasChildren"] = false;
                tree.push(row);
            }
        }
        for (const [index, row] of tree.entries()) {
            row.index = index;
        }
        return tree;
    }

    /* Key Navigation Helpers */
    private _onRightPress(treeRow: TreeRow) {
        if (this.isExpanded(treeRow.id)) {
            if (this.shiftKey) {
                this.focusedIndices.add(this.lastFocusedIndex + 1);
            } else {
                this.focusedIndices = new Set([this.lastFocusedIndex + 1]);
            }
            this.lastFocusedIndex++;
        } else {
            this.expand(treeRow);
        }
    }

    private _onLeftPress(treeRow: TreeRow) {
        if (this.isExpanded(treeRow.id)) {
            this.collapse(treeRow);
        } else if (treeRow.parent) {
            if (this.shiftKey) {
                this.focusedIndices.add(treeRow.parent.index);
            } else {
                this.focusedIndices = new Set([treeRow.parent.index]);
            }
            this.lastFocusedIndex = treeRow.parent.index;
        }
    }

    private _tabForward(treeRow: TreeRow) {
        this.focusedIndices = new Set([this.lastFocusedIndex]);
        if (this.focusedAction === null) {
            this.focusedAction = 0;
        } else {
            this.focusedAction++;
        }
        this.changeDetector.markForCheck();
    }

    private _tabBackward(treeRow: TreeRow) {
        if (this.focusedAction === null) { return; }

        this.focusedAction--;
        if (this.focusedAction < 0) {
            this.focusedAction = null;
        }
        this.changeDetector.markForCheck();
    }

    private _execItemAction(treeRow: TreeRow) {
        const arr = this._itemComponents.toArray();
        arr[treeRow.index].execAction();
    }
}
