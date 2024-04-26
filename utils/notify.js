const title = process.argv[2]
const content = process.argv[3]
const useUserNotify = process.argv[4] === 'true'
const notify = useUserNotify ? require(`${process.env.ARCADIA_DIR}/config/sendNotify`) : require(`${process.env.ARCADIA_DIR}/utils/sendNotify`)
notify.sendNotify(`${title}`, `${content}`)
