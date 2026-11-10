// Lifecycle of one background listener. `epoch` tells a stale thread from the current one
// after stop() + start() in quick succession.
pub struct ListenerState<S> {
    running: bool,
    epoch: u64,
    shutdown: Option<S>,
}

impl<S> ListenerState<S> {
    pub fn new() -> Self {
        Self { running: false, epoch: 0, shutdown: None }
    }

    pub fn is_running(&self) -> bool {
        self.running
    }

    // None if a listener is already running (double start).
    pub fn begin(&mut self) -> Option<u64> {
        if self.running {
            return None;
        }
        self.running = true;
        self.epoch += 1;
        Some(self.epoch)
    }

    // Gives the handle back when the listener was stopped or replaced meanwhile.
    pub fn attach(&mut self, epoch: u64, shutdown: S) -> Option<S> {
        if self.running && self.epoch == epoch {
            self.shutdown = Some(shutdown);
            None
        } else {
            Some(shutdown)
        }
    }

    pub fn stop(&mut self) -> Option<S> {
        self.running = false;
        self.shutdown.take()
    }

    pub fn finished(&mut self, epoch: u64) {
        if self.epoch == epoch {
            self.running = false;
            self.shutdown = None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn second_begin_is_refused() {
        let mut s: ListenerState<u8> = ListenerState::new();
        assert!(s.begin().is_some());
        assert!(s.is_running());
        assert!(s.begin().is_none());
    }

    #[test]
    fn stop_returns_attached_handle_and_allows_restart() {
        let mut s = ListenerState::new();
        let g = s.begin().unwrap();
        assert!(s.attach(g, 7u8).is_none());
        assert_eq!(s.stop(), Some(7));
        assert!(!s.is_running());
        assert!(s.begin().is_some());
    }

    #[test]
    fn stop_before_attach_returns_handle_to_caller() {
        let mut s = ListenerState::new();
        let g = s.begin().unwrap();
        assert_eq!(s.stop(), None);
        assert_eq!(s.attach(g, 7u8), Some(7));
    }

    #[test]
    fn stale_thread_cannot_touch_new_listener() {
        let mut s = ListenerState::new();
        let old = s.begin().unwrap();
        s.attach(old, 1u8);
        s.stop();
        let new = s.begin().unwrap();
        assert_eq!(s.attach(old, 2), Some(2));
        s.finished(old);
        assert!(s.is_running());
        assert!(s.attach(new, 3).is_none());
        assert_eq!(s.stop(), Some(3));
    }

    #[test]
    fn finished_clears_running_for_current_generation() {
        let mut s = ListenerState::new();
        let g = s.begin().unwrap();
        s.attach(g, 1u8);
        s.finished(g);
        assert!(!s.is_running());
        assert!(s.begin().is_some());
    }
}
