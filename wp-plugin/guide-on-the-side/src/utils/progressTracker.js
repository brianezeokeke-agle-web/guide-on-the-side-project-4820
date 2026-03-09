export function createProgressTracker({tutorialId, slideIds, onEvent}) {
    const visited = new Set();
    const startedAt = Date.now();
    let completed = false;

    function emit(type, payload = {}) {
        onEvent?.({
            type,
            tutorialId,
            ts: Date.now(),
            ...payload,
        });
    }

    function start() {
        emit("tutorial_start", { startedAt });
    }

    function viewSlide(slideId, index) {
        visited.add(slideId);
        emit("slide_view", { slideId, index, visitedCount: visited.size });

        const isLastSlide = index === slideIds.length - 1;
        const visitedAll = visited.size === slideIds.length;

        if (!completed && isLastSlide && visitedAll) {
            completed = true;
            emit("tutorial_complete", {
                completedAt: Date.now(),
                durationMs: Date.now() - startedAt,
            });
        }
    }

    function isCompleted() {
        return completed;
    }

    function getProgress() {
        return {
            visitedCount: visited.size,
            totalSlides: slideIds.length,
            completed,
        };
    }

    return { start, viewSlide, isCompleted, getProgress };
}